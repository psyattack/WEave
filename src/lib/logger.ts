/**
 * Centralized logging module for WEave frontend
 *
 * Provides structured logging with different levels and automatic persistence
 */

import { invoke } from '@tauri-apps/api/core';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

class Logger {
  private context: string;
  private enabled: boolean = true;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} [${this.context}] ${message}${dataStr}`;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.enabled) return;

    // Log to console in development
    if (import.meta.env.DEV) {
      const consoleMethod = entry.level === LogLevel.ERROR ? 'error'
        : entry.level === LogLevel.WARN ? 'warn'
        : entry.level === LogLevel.DEBUG ? 'debug'
        : 'info';

      console[consoleMethod](
        this.formatMessage(entry.level, entry.message, entry.data)
      );
    }

    // Send to backend for file logging
    try {
      await invoke('log_frontend_message', {
        level: entry.level,
        context: entry.context,
        message: entry.message,
        data: entry.data ? JSON.stringify(entry.data) : undefined,
      }).catch(() => {
        // Silently fail if backend logging is not available
      });
    } catch {
      // Ignore backend logging errors
    }
  }

  debug(message: string, data?: unknown): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      context: this.context,
      message,
      data,
    });
  }

  info(message: string, data?: unknown): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      context: this.context,
      message,
      data,
    });
  }

  warn(message: string, data?: unknown): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      context: this.context,
      message,
      data,
    });
  }

  error(message: string, error?: unknown): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      context: this.context,
      message,
      data: errorData,
    });
  }

  /**
   * Log a successful operation
   */
  success(operation: string, details?: unknown): void {
    this.info(`✓ ${operation}`, details);
  }

  /**
   * Log a failed operation
   */
  failure(operation: string, error: unknown): void {
    this.error(`✗ ${operation}`, error);
  }

  /**
   * Create a child logger with additional context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }

  /**
   * Disable logging for this instance
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable logging for this instance
   */
  enable(): void {
    this.enabled = true;
  }
}

/**
 * Create a logger instance with context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default application logger
 */
export const logger = createLogger('app');

/**
 * Log an async operation with automatic error handling
 */
export async function logOperation<T>(
  logger: Logger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  logger.info(`Starting: ${operation}`);
  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = (performance.now() - startTime).toFixed(2);
    logger.success(operation, { duration: `${duration}ms` });
    return result;
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    logger.failure(operation, { error, duration: `${duration}ms` });
    throw error;
  }
}

/**
 * Create a performance timer
 */
export function createTimer(logger: Logger, operation: string) {
  const startTime = performance.now();

  return {
    end: (success: boolean = true) => {
      const duration = (performance.now() - startTime).toFixed(2);
      if (success) {
        logger.debug(`${operation} completed in ${duration}ms`);
      } else {
        logger.warn(`${operation} failed after ${duration}ms`);
      }
    }
  };
}
