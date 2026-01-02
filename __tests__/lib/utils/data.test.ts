import { describe, it, expect, jest } from '@jest/globals';

describe('utils/data', () => {
  it('debounce calls function once after wait', async () => {
    const { debounce } = require('@/lib/utils/data');
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('generateId returns a 7+ char string', () => {
    const { generateId } = require('@/lib/utils/data');
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThanOrEqual(7);
  });

  it('parseQueryString parses params', () => {
    const { parseQueryString } = require('@/lib/utils/data');
    const params = parseQueryString('?a=1&b=two');
    expect(params).toEqual({ a: '1', b: 'two' });
  });

  it('safeJsonParse returns fallback on invalid JSON', () => {
    const { safeJsonParse } = require('@/lib/utils/data');
    const good = safeJsonParse('{"x":1}', { y: 2 });
    expect(good).toEqual({ x: 1 });
    const bad = safeJsonParse('{', { y: 2 });
    expect(bad).toEqual({ y: 2 });
  });

  it('sleep resolves after ms', async () => {
    const { sleep } = require('@/lib/utils/data');
    const start = Date.now();
    await sleep(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });
});

