/**
 * Utility functions for date handling
 */

export class DateUtils {
  /**
   * Format date to ISO string
   */
  public static toISOString(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Format date to local date string (YYYY-MM-DD)
   */
  public static toLocalDateString(date: Date = new Date()): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Format date to local time string (HH:MM:SS)
   */
  public static toLocalTimeString(date: Date = new Date()): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  /**
   * Format date to readable string
   */
  public static toReadableString(date: Date = new Date()): string {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
   * Get today's date as YYYY-MM-DD
   */
  public static getToday(): string {
    return this.toLocalDateString();
  }

  /**
   * Get yesterday's date as YYYY-MM-DD
   */
  public static getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.toLocalDateString(yesterday);
  }

  /**
   * Get date N days ago
   */
  public static getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.toLocalDateString(date);
  }

  /**
   * Parse ISO string to Date
   */
  public static parseISOString(isoString: string): Date {
    return new Date(isoString);
  }

  /**
   * Get duration in ms formatted as readable string
   */
  public static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Get relative time string (e.g., "2 hours ago")
   */
  public static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return "just now";
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  /**
   * Check if date is today
   */
  public static isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Check if date is yesterday
   */
  public static isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  }

  /**
   * Get start of day
   */
  public static getStartOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of day
   */
  public static getEndOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }
}
