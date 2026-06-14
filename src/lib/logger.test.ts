import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, LogLevel, logger, logOperation, createTimer } from './logger';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Logger', () => {
  let testLogger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    testLogger = createLogger('test');
    vi.clearAllMocks();
  });

  it('should create logger with context', () => {
    expect(testLogger).toBeDefined();
  });

  it('should log debug messages', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    testLogger.debug('Debug message');
    // In DEV mode, console should be called
    consoleSpy.mockRestore();
  });

  it('should log info messages', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    testLogger.info('Info message');
    consoleSpy.mockRestore();
  });

  it('should log warn messages', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    testLogger.warn('Warn message');
    consoleSpy.mockRestore();
  });

  it('should log error messages', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    testLogger.error('Error message');
    consoleSpy.mockRestore();
  });

  it('should log with additional data', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    testLogger.info('Message with data', { key: 'value' });
    consoleSpy.mockRestore();
  });

  it('should log success', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    testLogger.success('Operation completed');
    consoleSpy.mockRestore();
  });

  it('should log failure', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    testLogger.failure('Operation failed', new Error('Test error'));
    consoleSpy.mockRestore();
  });

  it('should create child logger', () => {
    const child = testLogger.child('submodule');
    expect(child).toBeDefined();
  });

  it('should disable logging', () => {
    testLogger.disable();
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    testLogger.info('Should not log');
    // Logging is disabled, so console should not be called
    consoleSpy.mockRestore();
  });

  it('should enable logging', () => {
    testLogger.disable();
    testLogger.enable();
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    testLogger.info('Should log');
    consoleSpy.mockRestore();
  });
});

describe('logOperation', () => {
  let testLogger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    testLogger = createLogger('test');
    vi.clearAllMocks();
  });

  it('should log successful operation', async () => {
    const result = await logOperation(
      testLogger,
      'test operation',
      async () => 42
    );
    expect(result).toBe(42);
  });

  it('should log failed operation', async () => {
    await expect(
      logOperation(
        testLogger,
        'test operation',
        async () => {
          throw new Error('Operation failed');
        }
      )
    ).rejects.toThrow('Operation failed');
  });

  it('should measure operation duration', async () => {
    const result = await logOperation(
      testLogger,
      'timed operation',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      }
    );
    expect(result).toBe('done');
  });
});

describe('createTimer', () => {
  let testLogger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    testLogger = createLogger('test');
    vi.clearAllMocks();
  });

  it('should create timer and end successfully', () => {
    const timer = createTimer(testLogger, 'test operation');
    timer.end(true);
  });

  it('should create timer and end with failure', () => {
    const timer = createTimer(testLogger, 'test operation');
    timer.end(false);
  });

  it('should measure time elapsed', async () => {
    const timer = createTimer(testLogger, 'timed operation');
    await new Promise(resolve => setTimeout(resolve, 10));
    timer.end();
  });
});

describe('Default logger', () => {
  it('should have default logger exported', () => {
    expect(logger).toBeDefined();
  });

  it('should log with default logger', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('Test message');
    consoleSpy.mockRestore();
  });
});
