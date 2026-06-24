/**
 * Session management for tracking Copilot interactions
 */

import { SessionInfo } from "./models";
import { logger } from "./logger";

export class SessionManager {
  private sessions: Map<string, SessionInfo> = new Map();
  private currentSessionId: string | null = null;

  /**
   * Start a new session
   */
  public startSession(): string {
    const sessionId = this.generateSessionId();
    const session: SessionInfo = {
      id: sessionId,
      startTime: Date.now(),
      totalTokens: 0,
      requestCount: 0,
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    logger.debug(`Session started: ${sessionId}`);
    return sessionId;
  }

  /**
   * Get current session ID
   */
  public getCurrentSessionId(): string {
    if (!this.currentSessionId) {
      this.currentSessionId = this.startSession();
    }
    return this.currentSessionId;
  }

  /**
   * Record token usage for current session
   */
  public recordTokenUsage(tokens: number): void {
    const sessionId = this.getCurrentSessionId();
    const session = this.sessions.get(sessionId);

    if (session) {
      session.totalTokens += tokens;
      session.requestCount += 1;
      logger.debug(`Session ${sessionId} token usage recorded: +${tokens} tokens`);
    }
  }

  /**
   * Get session information
   */
  public getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get current session information
   */
  public getCurrentSession(): SessionInfo | undefined {
    if (!this.currentSessionId) {
      return undefined;
    }
    return this.sessions.get(this.currentSessionId);
  }

  /**
   * End current session
   */
  public endCurrentSession(): SessionInfo | undefined {
    if (!this.currentSessionId) {
      return undefined;
    }

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.endTime = Date.now();
      logger.info(`Session ended: ${this.currentSessionId}`, {
        duration: session.endTime - session.startTime,
        tokens: session.totalTokens,
        requests: session.requestCount,
      });
    }

    this.currentSessionId = null;
    return session;
  }

  /**
   * Get all sessions
   */
  public getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    totalTokens: number;
    averageTokensPerSession: number;
  } {
    const sessions = this.getAllSessions();
    const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
    const activeSessions = sessions.filter((s) => !s.endTime).length;

    return {
      totalSessions: sessions.length,
      activeSessions,
      totalTokens,
      averageTokensPerSession: sessions.length > 0 ? totalTokens / sessions.length : 0,
    };
  }

  /**
   * Clear all sessions
   */
  public clearSessions(): void {
    this.sessions.clear();
    this.currentSessionId = null;
    logger.debug("All sessions cleared");
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `session_${timestamp}_${random}`;
  }
}

export const sessionManager = new SessionManager();
