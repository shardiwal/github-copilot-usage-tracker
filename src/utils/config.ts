/**
 * Configuration utilities
 */

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { TrackerSettings } from "../tracker/models";

export class ConfigUtils {
  private static readonly extensionName = "copilot-tracker";

  /**
   * Get tracker settings from VS Code config
   */
  public static getSettings(): TrackerSettings {
    const config = vscode.workspace.getConfiguration(ConfigUtils.extensionName);

    return {
      enabled: config.get("enabled", true),
      showStatusBar: config.get("showStatusBar", true),
      showNotifications: config.get("showNotifications", true),
      autoExport: config.get("autoExport", false),
      databaseLocation: config.get("databaseLocation", ""),
      maxHistory: config.get("maxHistory", 10000),
      notificationThresholds: config.get("notificationThresholds", [100000, 250000, 500000]),
    };
  }

  /**
   * Update tracker setting
   */
  public static async updateSetting(key: string, value: unknown): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigUtils.extensionName);
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  /**
   * Get database path (legacy - use extension context instead)
   * @deprecated Use context.globalStorageUri instead
   */
  public static getDatabasePath(): string {
    const settings = this.getSettings();

    if (settings.databaseLocation) {
      return settings.databaseLocation;
    }

    // Fallback to home directory
    return path.join(os.homedir(), ".vscode-copilot-tracker", "usage-tracker.db");
  }

  /**
   * Get export directory
   */
  public static getExportDirectory(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return workspaceFolder.uri.fsPath;
    }
    return os.homedir();
  }

  /**
   * Watch for settings changes
   */
  public static onSettingsChange(
    callback: (settings: TrackerSettings) => void
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(ConfigUtils.extensionName)) {
        callback(this.getSettings());
      }
    });
  }

  /**
   * Get workspace folder path
   */
  public static getWorkspacePath(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return workspaceFolder.uri.fsPath;
    }
    return os.homedir();
  }

  /**
   * Get all workspace folders
   */
  public static getWorkspaceFolders(): string[] {
    return vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];
  }

  /**
   * Get current file path
   */
  public static getCurrentFilePath(): string {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      return editor.document.uri.fsPath;
    }
    return "";
  }

  /**
   * Get current file language
   */
  public static getCurrentFileLanguage(): string {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      return editor.document.languageId;
    }
    return "";
  }
}
