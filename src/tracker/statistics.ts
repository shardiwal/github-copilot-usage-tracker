/**
 * Analytics and statistics calculation
 */

import { Database } from "./database";
import { Analytics, ChartData, DailyStats, UsageRecord, FilterOptions } from "./models";
import { logger } from "./logger";

export class Statistics {
  constructor(private database: Database) {}

  /**
   * Get comprehensive analytics
   */
  public async getAnalytics(filters?: FilterOptions): Promise<Analytics> {
    const records = await this.database.getUsageRecords(filters);

    if (records.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        averagePromptTokens: 0,
        averageResponseTokens: 0,
        largestPrompt: 0,
        largestResponse: 0,
        mostActiveWorkspace: "N/A",
        mostActiveLanguage: "N/A",
        averageSessionDuration: 0,
        tokensPerDay: {},
        tokensPerWorkspace: {},
        tokensPerLanguage: {},
      };
    }

    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0);
    const largestPromptRecord = records.reduce((prev, current) =>
      current.inputTokens > prev.inputTokens ? current : prev
    );
    const largestResponseRecord = records.reduce((prev, current) =>
      current.outputTokens > prev.outputTokens ? current : prev
    );

    const workspaceTokens = this.groupBy(records, "workspace");
    const languageTokens = this.groupBy(records, "language");
    const dayTokens = this.groupByDate(records);

    const sessions = this.getUniqueSessions(records);
    const sessionDurations = records
      .map((r) => r.duration)
      .reduce((sum, d) => sum + d, 0);
    const averageSessionDuration =
      sessions.length > 0 ? sessionDurations / sessions.length : 0;

    return {
      totalRequests: records.length,
      totalTokens: totalInputTokens + totalOutputTokens,
      averagePromptTokens: Math.round(totalInputTokens / records.length),
      averageResponseTokens: Math.round(totalOutputTokens / records.length),
      largestPrompt: largestPromptRecord.inputTokens,
      largestResponse: largestResponseRecord.outputTokens,
      mostActiveWorkspace: this.getMostActive(workspaceTokens),
      mostActiveLanguage: this.getMostActive(languageTokens),
      averageSessionDuration,
      tokensPerDay: this.convertToTokenMap(dayTokens),
      tokensPerWorkspace: this.convertToTokenMap(workspaceTokens),
      tokensPerLanguage: this.convertToTokenMap(languageTokens),
    };
  }

  /**
   * Get daily statistics
   */
  public async getDailyStats(date: string): Promise<DailyStats> {
    const records = await this.database.getRecordsByDate(date);

    if (records.length === 0) {
      return {
        date,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
        averageTokens: 0,
        averageInputTokens: 0,
        averageOutputTokens: 0,
      };
    }

    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;

    return {
      date,
      totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      requestCount: records.length,
      averageTokens: Math.round(totalTokens / records.length),
      averageInputTokens: Math.round(totalInputTokens / records.length),
      averageOutputTokens: Math.round(totalOutputTokens / records.length),
    };
  }

  /**
   * Get chart data for dashboard
   */
  public async getChartData(days: number = 30): Promise<ChartData> {
    const records = await this.database.getUsageRecords();
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const filteredRecords = records.filter(
      (r) => new Date(r.timestamp) >= cutoffDate
    );

    const dailyData: Record<string, number> = {};
    const hourlyData: Record<number, number> = {};
    const languageData: Record<string, number> = {};
    const workspaceData: Record<string, number> = {};
    const fileData: Record<string, number> = {};

    for (const record of filteredRecords) {
      const date = record.timestamp.split("T")[0];
      const hour = new Date(record.timestamp).getHours();

      dailyData[date] = (dailyData[date] ?? 0) + record.totalTokens;
      hourlyData[hour] = (hourlyData[hour] ?? 0) + record.totalTokens;
      languageData[record.language] =
        (languageData[record.language] ?? 0) + record.totalTokens;
      workspaceData[record.workspace] =
        (workspaceData[record.workspace] ?? 0) + record.totalTokens;
      fileData[record.file] = (fileData[record.file] ?? 0) + record.totalTokens;
    }

    return {
      daily: Object.entries(dailyData)
        .map(([date, tokens]) => ({ date, tokens }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        tokens: hourlyData[i] ?? 0,
      })),
      byLanguage: Object.entries(languageData)
        .map(([language, tokens]) => ({ language, tokens }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10),
      byWorkspace: Object.entries(workspaceData)
        .map(([workspace, tokens]) => ({ workspace, tokens }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10),
      byFile: Object.entries(fileData)
        .map(([file, tokens]) => ({ file, tokens }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10),
    };
  }

  /**
   * Get today's statistics
   */
  public async getTodayStats(): Promise<DailyStats> {
    const today = new Date().toISOString().split("T")[0];
    return this.getDailyStats(today);
  }

  /**
   * Get weekly statistics
   */
  public async getWeeklyStats(): Promise<DailyStats> {
    const records = await this.database.getUsageRecords();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekRecords = records.filter(
      (r) => new Date(r.timestamp) >= weekAgo
    );

    if (weekRecords.length === 0) {
      return {
        date: `Last 7 days`,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
        averageTokens: 0,
        averageInputTokens: 0,
        averageOutputTokens: 0,
      };
    }

    const totalInputTokens = weekRecords.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = weekRecords.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;

    return {
      date: `Last 7 days`,
      totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      requestCount: weekRecords.length,
      averageTokens: Math.round(totalTokens / weekRecords.length),
      averageInputTokens: Math.round(totalInputTokens / weekRecords.length),
      averageOutputTokens: Math.round(totalOutputTokens / weekRecords.length),
    };
  }

  /**
   * Get monthly statistics
   */
  public async getMonthlyStats(): Promise<DailyStats> {
    const records = await this.database.getUsageRecords();
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const monthRecords = records.filter(
      (r) => new Date(r.timestamp) >= monthAgo
    );

    if (monthRecords.length === 0) {
      return {
        date: `Last 30 days`,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
        averageTokens: 0,
        averageInputTokens: 0,
        averageOutputTokens: 0,
      };
    }

    const totalInputTokens = monthRecords.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = monthRecords.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;

    return {
      date: `Last 30 days`,
      totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      requestCount: monthRecords.length,
      averageTokens: Math.round(totalTokens / monthRecords.length),
      averageInputTokens: Math.round(totalInputTokens / monthRecords.length),
      averageOutputTokens: Math.round(totalOutputTokens / monthRecords.length),
    };
  }

  /**
   * Group records by field
   */
  private groupBy(
    records: UsageRecord[],
    field: keyof UsageRecord
  ): Record<string, number> {
    const grouped: Record<string, number> = {};

    for (const record of records) {
      const key = String(record[field]);
      grouped[key] = (grouped[key] ?? 0) + record.totalTokens;
    }

    return grouped;
  }

  /**
   * Group records by date
   */
  private groupByDate(records: UsageRecord[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    for (const record of records) {
      const date = record.timestamp.split("T")[0];
      grouped[date] = (grouped[date] ?? 0) + record.totalTokens;
    }

    return grouped;
  }

  /**
   * Get most active category
   */
  private getMostActive(grouped: Record<string, number>): string {
    if (Object.keys(grouped).length === 0) {
      return "N/A";
    }

    return Object.entries(grouped).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    )[0];
  }

  /**
   * Convert group data to token map
   */
  private convertToTokenMap(data: Record<string, number>): Record<string, number> {
    return data;
  }

  /**
   * Get unique sessions from records
   */
  private getUniqueSessions(records: UsageRecord[]): string[] {
    return Array.from(new Set(records.map((r) => r.sessionId)));
  }
}
