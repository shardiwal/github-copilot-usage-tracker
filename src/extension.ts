/**
 * Main extension entry point
 */

import * as vscode from "vscode";
import * as path from "path";
import { Database } from "./tracker/database";
import { Statistics } from "./tracker/statistics";
import { sessionManager } from "./tracker/sessionManager";
import { logger } from "./tracker/logger";
import { ConfigUtils } from "./utils/config";
import { DateUtils } from "./utils/date";
import { askCopilotCommand } from "./commands/askCopilot";
import { exportCsvCommand } from "./commands/exportCsv";
import { exportJsonCommand } from "./commands/exportJson";
import { clearHistoryCommand } from "./commands/clearHistory";
import { diagnosticCommand } from "./commands/diagnostic";
import { UsageTreeProvider } from "./tree/usageTreeProvider";
import { StatusBar } from "./statusbar/statusBar";
import { DashboardProvider, showDashboard } from "./webview/dashboardProvider";
import { registerChatParticipant } from "./chat/trackerParticipant";
import { hookBridge } from "./hooks/hookBridge";

let database: Database;
let statistics: Statistics;
let statusBar: StatusBar;
let treeProvider: UsageTreeProvider;
let dashboardProvider: DashboardProvider | undefined;
let notificationThresholds: number[] = [];

/**
 * Extension activation.
 *
 * Initialises all subsystems in order:
 *  1. SQLite database (global storage path)
 *  2. Session manager
 *  3. Commands, tree view, status bar, webview dashboard
 *  4. Chat participant (@tracker) — forwards chat messages to a Copilot
 *     language model and records input/output tokens in the database
 *  5. Settings watcher, daily pruning, and threshold notifications
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    logger.info("Copilot Usage Tracker extension activating...");

    // Initialize database with proper storage location
    const dbPath = path.join(context.globalStorageUri.fsPath, "usage-tracker.db");
    database = new Database(dbPath);
    statistics = new Statistics(database);

    // Wait for database to finish initialising; surface errors immediately.
    try {
      await database.waitForInit();
    } catch (dbErr) {
      logger.error("Database failed to initialize", dbErr);
      await vscode.window.showErrorMessage(
        `Copilot Tracker: Database initialization failed — ${dbErr instanceof Error ? dbErr.message : String(dbErr)}. Token usage will NOT be saved.`
      );
      // Continue activation so commands/UI still register (they will show errors if used).
    }

    // Initialize session
    sessionManager.startSession();

    // Load settings
    const settings = ConfigUtils.getSettings();
    notificationThresholds = settings.notificationThresholds;

    // Register commands
    registerCommands(context);

    // Register tree view
    registerTreeView(context);

    // Register status bar
    registerStatusBar(context);

    // Register webview
    registerWebview(context);

    // Register chat participant (@tracker)
    registerChatParticipant(context, database, dashboardProvider);

    // Start hook bridge — captures Ask / Agent mode prompts automatically
    hookBridge.start(database, dashboardProvider).catch((err) =>
      logger.error("HookBridge failed to start", err)
    );

    // Watch for settings changes
    const settingsWatcher = ConfigUtils.onSettingsChange((newSettings) => {
      notificationThresholds = newSettings.notificationThresholds;
      if (statusBar && !newSettings.showStatusBar) {
        statusBar.hide();
      } else if (statusBar && newSettings.showStatusBar) {
        statusBar.show();
      }
    });

    context.subscriptions.push(settingsWatcher);

    // Prune old records periodically
    setInterval(async () => {
      const settings = ConfigUtils.getSettings();
      await database.pruneOldRecords(settings.maxHistory);
    }, 24 * 60 * 60 * 1000); // Daily

    // Check for daily notifications
    checkDailyNotifications();
    setInterval(checkDailyNotifications, 60 * 60 * 1000); // Hourly

    logger.info("Copilot Usage Tracker extension activated successfully");
  } catch (error) {
    logger.error("Failed to activate extension", error);
    await vscode.window.showErrorMessage("Failed to activate Copilot Usage Tracker");
  }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  try {
    if (database) {
      database.close();
    }

    if (statusBar) {
      statusBar.dispose();
    }

    if (treeProvider) {
      // Tree provider cleanup handled by VS Code
    }

    hookBridge.stop();
    sessionManager.endCurrentSession();
    logger.info("Copilot Usage Tracker extension deactivated");
  } catch (error) {
    logger.error("Error deactivating extension", error);
  }
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  const commands = [
    {
      command: "copilot-tracker.ask",
      handler: () => askCopilotCommand(context, database),
    },
    {
      command: "copilot-tracker.dashboard",
      handler: () => showDashboard(context, database, statistics),
    },
    {
      command: "copilot-tracker.exportCsv",
      handler: () => exportCsvCommand(context, database, statistics),
    },
    {
      command: "copilot-tracker.exportJson",
      handler: () => exportJsonCommand(context, database, statistics),
    },
    {
      command: "copilot-tracker.clearHistory",
      handler: () => clearHistoryCommand(context, database),
    },
    {
      command: "copilot-tracker.diagnostic",
      handler: () => diagnosticCommand(context, database, statistics),
    },
    {
      command: "copilot-tracker.refresh",
      handler: () => {
        if (treeProvider) {
          treeProvider.refresh();
        }
        if (statusBar) {
          statusBar.update();
        }
      },
    },
  ];

  commands.forEach(({ command, handler }) => {
    const disposable = vscode.commands.registerCommand(command, handler);
    context.subscriptions.push(disposable);
    logger.debug(`Registered command: ${command}`);
  });
}

/**
 * Register tree view provider
 */
function registerTreeView(context: vscode.ExtensionContext): void {
  try {
    treeProvider = new UsageTreeProvider(database, statistics);

    const treeView = vscode.window.createTreeView("copilot-usage-tree", {
      treeDataProvider: treeProvider,
    });

    context.subscriptions.push(treeView);
    logger.debug("Tree view registered");
  } catch (error) {
    logger.error("Error registering tree view", error);
  }
}

/**
 * Register status bar
 */
function registerStatusBar(context: vscode.ExtensionContext): void {
  try {
    const settings = ConfigUtils.getSettings();
    statusBar = new StatusBar(database);

    if (settings.showStatusBar) {
      statusBar.show();
    }

    context.subscriptions.push(statusBar);
    logger.debug("Status bar registered");
  } catch (error) {
    logger.error("Error registering status bar", error);
  }
}

/**
 * Register webview provider
 */
function registerWebview(context: vscode.ExtensionContext): void {
  try {
    dashboardProvider = new DashboardProvider(context, database, statistics);
    const provider = dashboardProvider;

    const disposable = vscode.window.registerWebviewViewProvider(
      DashboardProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    );

    context.subscriptions.push(disposable);
    logger.debug("Webview provider registered");
  } catch (error) {
    logger.error("Error registering webview provider", error);
  }
}

/**
 * Check and show daily notifications for token thresholds
 */
async function checkDailyNotifications(): Promise<void> {
  try {
    const settings = ConfigUtils.getSettings();
    if (!settings.showNotifications || notificationThresholds.length === 0) {
      return;
    }

    const today = DateUtils.getToday();
    const todayTokens = await database.getTotalTokensByDate(today);

    for (const threshold of notificationThresholds) {
      const lastNotificationKey = `notification_${today}_${threshold}`;
      const lastNotification = await database.getSetting(lastNotificationKey);

      if (todayTokens >= threshold && !lastNotification) {
        vscode.window.showWarningMessage(
          `⚠️ Copilot Usage Alert: You've reached ${threshold.toLocaleString()} tokens today!`
        );

        await database.setSetting(lastNotificationKey, new Date().toISOString());
      }
    }
  } catch (error) {
    logger.error("Error checking daily notifications", error);
  }
}
