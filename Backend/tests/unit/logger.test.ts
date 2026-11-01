import { describe, it, expect } from 'vitest';
import { logger } from '../../src/utils/logger';

describe('Logger', () => {
  it('is defined and has all log methods', () => {
    expect(logger.debug).toBeTypeOf('function');
    expect(logger.info).toBeTypeOf('function');
    expect(logger.warn).toBeTypeOf('function');
    expect(logger.error).toBeTypeOf('function');
  });

  it('does not throw when logging with meta', () => {
    expect(() =>
      logger.info('test message', { key: 'value', nested: { a: 1 } }),
    ).not.toThrow();
  });

  it('does not throw when logging without meta', () => {
    expect(() => logger.warn('warning')).not.toThrow();
  });
});
