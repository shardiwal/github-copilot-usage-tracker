/**
 * Logging utility for Copilot Usage Tracker
 */

import * as vscode from "vscode";

export enum LogLevel {
  Debug = "DEBUG",
  Info = "INFO",
  Warn = "WARN",
  Error = "ERROR",
}

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Copilot Usage Tracker");
  }

  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.Debug, message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log(LogLevel.Info, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.Warn, message, data);
  }

  public error(message: string, error?: unknown): void {
    this.log(LogLevel.Error, message, error);
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    this.outputChannel.appendLine(logMessage);

    if (data !== undefined) {
      if (typeof data === "string") {
        this.outputChannel.appendLine(`  ${data}`);
      } else {
        this.outputChannel.appendLine(`  ${JSON.stringify(data, null, 2)}`);
      }
    }

    if (level === LogLevel.Error) {
      console.error(logMessage, data);
    } else if (level === LogLevel.Warn) {
      console.warn(logMessage, data);
    } else {
      console.log(logMessage, data);
    }
  }

  public show(): void {
    this.outputChannel.show();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = new Logger();
