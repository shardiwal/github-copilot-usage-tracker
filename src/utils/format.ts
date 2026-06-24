/**
 * Utility functions for formatting
 */

export class FormatUtils {
  /**
   * Format bytes to human readable string
   */
  public static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Format tokens for display
   */
  public static formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(2)}K`;
    }
    return tokens.toString();
  }

  /**
   * Format cost in USD
   */
  public static formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Format percentage
   */
  public static formatPercentage(value: number, total: number): string {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  }

  /**
   * Format number with commas
   */
  public static formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /**
   * Truncate string to max length
   */
  public static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + "...";
  }

  /**
   * Escape HTML special characters
   */
  public static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Capitalize first letter
   */
  public static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format title case
   */
  public static toTitleCase(str: string): string {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Format file path to display
   */
  public static formatFilePath(filePath: string, maxLength: number = 50): string {
    if (filePath.length <= maxLength) {
      return filePath;
    }

    const parts = filePath.split("/");
    let result = parts[parts.length - 1];

    for (let i = parts.length - 2; i >= 0 && result.length < maxLength; i--) {
      result = parts[i] + "/" + result;
    }

    if (result.length > maxLength) {
      result = ".../" + result.substring(result.length - maxLength + 4);
    }

    return result;
  }

  /**
   * Format workspace name
   */
  public static formatWorkspaceName(workspace: string): string {
    const parts = workspace.split("/");
    return parts[parts.length - 1] || workspace;
  }

  /**
   * Format duration in milliseconds
   */
  public static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    if (ms < 3600000) {
      return `${(ms / 60000).toFixed(1)}m`;
    }
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Create CSV row
   */
  public static toCsvRow(values: unknown[]): string {
    return values
      .map((value) => {
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",");
  }
}
