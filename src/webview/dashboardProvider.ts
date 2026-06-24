/**
 * Webview provider for dashboard
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { Database } from "../tracker/database";
import { Statistics } from "../tracker/statistics";
import { logger } from "../tracker/logger";

export class DashboardProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "copilot-usage-dashboard";
  private view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private database: Database,
    private statistics: Statistics
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "src", "webview"),
      ],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message, webviewView.webview);
    });

    this.sendDashboardData(webviewView.webview).catch((error) => {
      logger.error("Error sending initial dashboard data", error);
    });

    // Auto-refresh dashboard every 30 seconds
    setInterval(() => {
      if (this.view?.visible) {
        this.sendDashboardData(webviewView.webview).catch((error) => {
          logger.error("Error sending dashboard data on interval", error);
        });
      }
    }, 30000);
  }

  private handleMessage(message: any, webview: vscode.Webview): void {
    switch (message.command) {
      case "getData":
        this.sendDashboardData(webview).catch((error) => {
          logger.error("Error sending dashboard data on demand", error);
        });
        break;
      case "exportCsv":
        vscode.commands.executeCommand("copilot-tracker.exportCsv");
        break;
      case "exportJson":
        vscode.commands.executeCommand("copilot-tracker.exportJson");
        break;
      case "clearHistory":
        vscode.commands.executeCommand("copilot-tracker.clearHistory");
        break;
      case "backupDb":
        this.backupDatabase().catch((error) => {
          logger.error("Error handling backupDb message", error);
        });
        break;
    }
  }

  private async sendDashboardData(webview: vscode.Webview): Promise<void> {
    try {
      const todayStats = await this.statistics.getTodayStats();
      const analytics = await this.statistics.getAnalytics();
      const chartData = await this.statistics.getChartData(30);
      const records = await this.database.getUsageRecords(undefined, 100);

      webview.postMessage({
        command: "updateDashboard",
        data: {
          todayStats,
          analytics,
          chartData,
        },
      });

      webview.postMessage({
        command: "dataRefreshed",
        records,
      });

      logger.debug("Dashboard data sent to webview");
    } catch (error) {
      logger.error("Error sending dashboard data", error);
    }
  }

  private async backupDatabase(): Promise<void> {
    try {
      const fileName = `copilot-tracker-backup-${new Date().toISOString().split("T")[0]}.db`;
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(fileName),
        filters: {
          "Database Files": ["db"],
          "All Files": ["*"],
        },
      });

      if (uri) {
        const success = await this.database.backup(uri.fsPath);
        if (success) {
          await vscode.window.showInformationMessage("Database backed up successfully");
          logger.info(`Database backed up to ${uri.fsPath}`);
        } else {
          await vscode.window.showErrorMessage("Failed to backup database");
        }
      }
    } catch (error) {
      logger.error("Error backing up database", error);
      await vscode.window.showErrorMessage("Error backing up database");
    }
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "src", "webview", "dashboard.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "src", "webview", "dashboard.js")
    );
    const nonce = this.getNonce();
    return buildDashboardHtml(
      fs.readFileSync(
        vscode.Uri.joinPath(this.context.extensionUri, "src", "webview", "dashboard.html").fsPath,
        "utf8"
      ),
      webview,
      styleUri,
      scriptUri,
      nonce
    );
  }
  private getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}

/**
 * Create and show dashboard in a new panel
 */
export async function showDashboard(
  context: vscode.ExtensionContext,
  database: Database,
  statistics: Statistics
): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "copilot-usage-dashboard",
    "Copilot Usage Dashboard",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "src", "webview"),
      ],
    }
  );

  const provider = new DashboardProvider(context, database, statistics);
  const nonce = getNonce();

  const styleUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "src", "webview", "dashboard.css")
  );
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "src", "webview", "dashboard.js")
  );

  panel.webview.html = getFullDashboardHtml(context, panel.webview, styleUri, scriptUri, nonce);

  panel.webview.onDidReceiveMessage((message) => {
    provider["handleMessage"](message, panel.webview);
  });

  provider["sendDashboardData"](panel.webview).catch((error) => {
    logger.error("Error sending initial dashboard data in panel", error);
  });

  // Auto-refresh dashboard
  const refreshInterval = setInterval(() => {
    if (panel.visible) {
      provider["sendDashboardData"](panel.webview).catch((error) => {
        logger.error("Error sending dashboard data in panel on interval", error);
      });
    }
  }, 30000);

  panel.onDidDispose(() => {
    clearInterval(refreshInterval);
  });
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Reads dashboard.html and injects the VS Code webview URIs, nonce, and CSP.
 * This is the single source of truth for the HTML — avoids duplication bugs.
 */
function buildDashboardHtml(
  rawHtml: string,
  webview: vscode.Webview,
  styleUri: vscode.Uri,
  scriptUri: vscode.Uri,
  nonce: string
): string {
  return rawHtml
    .replace(
      '<meta charset="UTF-8">',
      `<meta charset="UTF-8">\n    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">`,
    )
    .replace(
      '<link rel="stylesheet" href="dashboard.css">',
      `<link rel="stylesheet" href="${styleUri}">`
    )
    .replace(
      '<script src="dashboard.js"></script>',
      `<script nonce="${nonce}" src="${scriptUri}"></script>`
    );
}

function getFullDashboardHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  styleUri: vscode.Uri,
  scriptUri: vscode.Uri,
  nonce: string
): string {
  const htmlPath = vscode.Uri.joinPath(context.extensionUri, "src", "webview", "dashboard.html").fsPath;
  const rawHtml = fs.readFileSync(htmlPath, "utf8");
  return buildDashboardHtml(rawHtml, webview, styleUri, scriptUri, nonce);
}
