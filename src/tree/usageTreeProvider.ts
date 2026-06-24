/**
 * Tree view provider for usage analytics
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { Statistics } from "../tracker/statistics";
import { FormatUtils } from "../utils/format";
import { logger } from "../tracker/logger";

interface TreeItem {
  label: string;
  value?: string;
  collapsibleState?: vscode.TreeItemCollapsibleState;
  children?: TreeItem[];
  icon?: string;
}

export class UsageTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> =
    new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private database: Database,
    private statistics: Statistics
  ) {
    // Refresh tree every 30 seconds
    setInterval(() => this.refresh(), 30000);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.collapsibleState || vscode.TreeItemCollapsibleState.None
    );

    if (element.icon) {
      treeItem.iconPath = new vscode.ThemeIcon(element.icon);
    }

    if (element.value) {
      treeItem.description = element.value;
    }

    treeItem.tooltip = element.label + (element.value ? `: ${element.value}` : "");

    return treeItem;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element.children) {
      return Promise.resolve(element.children);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<TreeItem[]> {
    try {
      const todayStats = await this.statistics.getTodayStats();
      const weeklyStats = await this.statistics.getWeeklyStats();
      const monthlyStats = await this.statistics.getMonthlyStats();
      const analytics = await this.statistics.getAnalytics();

      return [
        {
          label: "📊 Today",
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          icon: "chart-bar",
          children: [
            {
              label: "Total Tokens",
              value: FormatUtils.formatTokens(todayStats.totalTokens),
              icon: "zap",
            },
            {
              label: "Requests",
              value: todayStats.requestCount.toString(),
              icon: "comment",
            },
            {
              label: "Input Tokens",
              value: FormatUtils.formatTokens(todayStats.inputTokens),
              icon: "arrow-right",
            },
            {
              label: "Output Tokens",
              value: FormatUtils.formatTokens(todayStats.outputTokens),
              icon: "arrow-left",
            },
            {
              label: "Average Tokens",
              value: FormatUtils.formatTokens(todayStats.averageTokens),
              icon: "graph",
            },
          ],
        },
        {
          label: "📈 Weekly",
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          icon: "chart-line",
          children: [
            {
              label: "Total Tokens",
              value: FormatUtils.formatTokens(weeklyStats.totalTokens),
              icon: "zap",
            },
            {
              label: "Requests",
              value: weeklyStats.requestCount.toString(),
              icon: "comment",
            },
            {
              label: "Average Tokens/Day",
              value: FormatUtils.formatTokens(weeklyStats.totalTokens / 7),
              icon: "graph",
            },
          ],
        },
        {
          label: "📉 Monthly",
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          icon: "diff-added",
          children: [
            {
              label: "Total Tokens",
              value: FormatUtils.formatTokens(monthlyStats.totalTokens),
              icon: "zap",
            },
            {
              label: "Requests",
              value: monthlyStats.requestCount.toString(),
              icon: "comment",
            },
            {
              label: "Average Tokens/Day",
              value: FormatUtils.formatTokens(monthlyStats.totalTokens / 30),
              icon: "graph",
            },
          ],
        },
        {
          label: "🔝 Statistics",
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          icon: "graph",
          children: [
            {
              label: "Total Requests",
              value: FormatUtils.formatNumber(analytics.totalRequests),
              icon: "comment",
            },
            {
              label: "All-time Tokens",
              value: FormatUtils.formatTokens(analytics.totalTokens),
              icon: "zap",
            },
            {
              label: "Most Active Language",
              value: analytics.mostActiveLanguage,
              icon: "code",
            },
            {
              label: "Most Active Workspace",
              value: analytics.mostActiveWorkspace,
              icon: "folder",
            },
            {
              label: "Largest Prompt",
              value: FormatUtils.formatTokens(analytics.largestPrompt),
              icon: "arrow-right",
            },
            {
              label: "Largest Response",
              value: FormatUtils.formatTokens(analytics.largestResponse),
              icon: "arrow-left",
            },
          ],
        },
      ];
    } catch (error) {
      logger.error("Error getting tree items", error);
      return [
        {
          label: "Error loading data",
          icon: "error",
        },
      ];
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
