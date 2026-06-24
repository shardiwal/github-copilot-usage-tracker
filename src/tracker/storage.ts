/**
 * Storage utilities for local data persistence
 */

import * as vscode from "vscode";
import { logger } from "../tracker/logger";

export class Storage {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Store value in global state
   */
  public setGlobal(key: string, value: unknown): void {
    try {
      this.context.globalState.update(key, value);
    } catch (error) {
      logger.error(`Failed to set global state: ${key}`, error);
    }
  }

  /**
   * Get value from global state
   */
  public getGlobal(key: string): unknown {
    try {
      return this.context.globalState.get(key);
    } catch (error) {
      logger.error(`Failed to get global state: ${key}`, error);
      return undefined;
    }
  }

  /**
   * Store value in workspace state
   */
  public setWorkspace(key: string, value: unknown): void {
    try {
      this.context.workspaceState.update(key, value);
    } catch (error) {
      logger.error(`Failed to set workspace state: ${key}`, error);
    }
  }

  /**
   * Get value from workspace state
   */
  public getWorkspace(key: string): unknown {
    try {
      return this.context.workspaceState.get(key);
    } catch (error) {
      logger.error(`Failed to get workspace state: ${key}`, error);
      return undefined;
    }
  }

  /**
   * Store string in global state
   */
  public setGlobalString(key: string, value: string): void {
    this.setGlobal(key, value);
  }

  /**
   * Get string from global state
   */
  public getGlobalString(key: string): string | undefined {
    const value = this.getGlobal(key);
    return typeof value === "string" ? value : undefined;
  }

  /**
   * Store object in global state
   */
  public setGlobalObject(key: string, value: Record<string, unknown>): void {
    this.setGlobal(key, value);
  }

  /**
   * Get object from global state
   */
  public getGlobalObject(key: string): Record<string, unknown> | undefined {
    const value = this.getGlobal(key);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
  }

  /**
   * Clear a key from global state
   */
  public clearGlobal(key: string): void {
    try {
      this.context.globalState.update(key, undefined);
    } catch (error) {
      logger.error(`Failed to clear global state: ${key}`, error);
    }
  }

  /**
   * Clear a key from workspace state
   */
  public clearWorkspace(key: string): void {
    try {
      this.context.workspaceState.update(key, undefined);
    } catch (error) {
      logger.error(`Failed to clear workspace state: ${key}`, error);
    }
  }
}
