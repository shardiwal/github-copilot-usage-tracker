/**
 * Data models and interfaces for Copilot Usage Tracker
 */

export interface UsageRecord {
  id: number;
  timestamp: string;
  workspace: string;
  language: string;
  file: string;
  prompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  duration: number;
  sessionId: string;
  model: string;
  cost: number;
}

export interface SessionInfo {
  id: string;
  startTime: number;
  endTime?: number;
  totalTokens: number;
  requestCount: number;
}

export interface DailyStats {
  date: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  averageTokens: number;
  averageInputTokens: number;
  averageOutputTokens: number;
}

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface Analytics {
  totalRequests: number;
  totalTokens: number;
  averagePromptTokens: number;
  averageResponseTokens: number;
  largestPrompt: number;
  largestResponse: number;
  mostActiveWorkspace: string;
  mostActiveLanguage: string;
  averageSessionDuration: number;
  tokensPerDay: Record<string, number>;
  tokensPerWorkspace: Record<string, number>;
  tokensPerLanguage: Record<string, number>;
}

export interface ChartData {
  daily: Array<{ date: string; tokens: number }>;
  hourly: Array<{ hour: number; tokens: number }>;
  byLanguage: Array<{ language: string; tokens: number }>;
  byWorkspace: Array<{ workspace: string; tokens: number }>;
  byFile: Array<{ file: string; tokens: number }>;
}

export interface ExportData {
  metadata: {
    exportedAt: string;
    totalRecords: number;
    totalTokens: number;
  };
  records: UsageRecord[];
  analytics: Analytics;
}

export interface TrackerSettings {
  enabled: boolean;
  showStatusBar: boolean;
  showNotifications: boolean;
  autoExport: boolean;
  databaseLocation: string;
  maxHistory: number;
  notificationThresholds: number[];
}

export interface FilterOptions {
  startDate?: string;
  endDate?: string;
  workspace?: string;
  language?: string;
  file?: string;
  minTokens?: number;
  maxTokens?: number;
}
