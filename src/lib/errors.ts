/**
 * Centralized error handling for WEave frontend
 *
 * Provides typed error classes and utilities for error handling
 */

import { createLogger } from './logger';

const errorLogger = createLogger('error-handler');

/**
 * Base error class for WEave application errors
 */
export class WEaveError extends Error {
  public readonly context?: string;
  public readonly originalError?: unknown;

  constructor(message: string, context?: string, originalError?: unknown) {
    super(message);
    this.name = 'WEaveError';
    this.context = context;
    this.originalError = originalError;

    // Maintain proper stack trace
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get full error message with context
   */
  getFullMessage(): string {
    if (this.context) {
      return `[${this.context}] ${this.message}`;
    }
    return this.message;
  }

  /**
   * Log this error
   */
  log(): void {
    errorLogger.error(this.getFullMessage(), {
      context: this.context,
      originalError: this.originalError,
      stack: this.stack,
    });
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'Network', originalError);
    this.name = 'NetworkError';
  }
}

/**
 * File system errors
 */
export class FileSystemError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'FileSystem', originalError);
    this.name = 'FileSystemError';
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'Config', originalError);
    this.name = 'ConfigError';
  }
}

/**
 * Workshop-related errors
 */
export class WorkshopError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'Workshop', originalError);
    this.name = 'WorkshopError';
  }
}

/**
 * Wallpaper Engine errors
 */
class WallpaperEngineError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'WallpaperEngine', originalError);
    this.name = 'WallpaperEngineError';
  }
}

/**
 * Download errors
 */
class DownloadError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'Download', originalError);
    this.name = 'DownloadError';
  }
}

/**
 * Authentication errors
 */
class AuthenticationError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'Authentication', originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends WEaveError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'Validation', originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = WEaveError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create a successful result
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create a failed result
 */
export function Err<E = WEaveError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Wrap a promise to return a Result instead of throwing
 */
export async function wrapAsync<T>(
  promise: Promise<T>,
  errorFactory?: (error: unknown) => WEaveError
): Promise<Result<T>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    const wrappedError = errorFactory
      ? errorFactory(error)
      : new WEaveError('Operation failed', undefined, error);
    wrappedError.log();
    return Err(wrappedError);
  }
}

/**
 * Wrap a sync function to return a Result instead of throwing
 */
export function wrap<T>(
  fn: () => T,
  errorFactory?: (error: unknown) => WEaveError
): Result<T> {
  try {
    const value = fn();
    return Ok(value);
  } catch (error) {
    const wrappedError = errorFactory
      ? errorFactory(error)
      : new WEaveError('Operation failed', undefined, error);
    wrappedError.log();
    return Err(wrappedError);
  }
}

/**
 * Handle errors with a callback
 */
export async function handleErrors<T>(
  promise: Promise<T>,
  onError?: (error: WEaveError) => void
): Promise<T | undefined> {
  try {
    return await promise;
  } catch (error) {
    const weaveError = error instanceof WEaveError
      ? error
      : new WEaveError('Unexpected error', undefined, error);

    weaveError.log();

    if (onError) {
      onError(weaveError);
    }

    return undefined;
  }
}

/**
 * Parse error from Tauri command result
 */
export function parseCommandError(error: unknown): WEaveError {
  if (typeof error === 'string') {
    // Parse Rust error string
    if (error.includes('Network error:')) {
      return new NetworkError(error.replace('Network error:', '').trim());
    }
    if (error.includes('File system error:') || error.includes('FileSystem')) {
      return new FileSystemError(error.replace('File system error:', '').trim());
    }
    if (error.includes('Configuration error:') || error.includes('Config')) {
      return new ConfigError(error.replace('Configuration error:', '').trim());
    }
    if (error.includes('Workshop error:')) {
      return new WorkshopError(error.replace('Workshop error:', '').trim());
    }
    if (error.includes('Wallpaper Engine error:')) {
      return new WallpaperEngineError(error.replace('Wallpaper Engine error:', '').trim());
    }
    if (error.includes('Download error:')) {
      return new DownloadError(error.replace('Download error:', '').trim());
    }
    if (error.includes('Authentication error:')) {
      return new AuthenticationError(error.replace('Authentication error:', '').trim());
    }

    return new WEaveError(error);
  }

  if (error instanceof Error) {
    return new WEaveError(error.message, undefined, error);
  }

  return new WEaveError('Unknown error', undefined, error);
}

/**
 * Assert a condition and throw if false
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    const error = new ValidationError(message);
    error.log();
    throw error;
  }
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof WEaveError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}
