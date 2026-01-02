import { describe, it, expect } from '@jest/globals';

describe('utils/formatting', () => {
  it('formatPhoneNumber formats 10 and 11 digit numbers', () => {
    const { formatPhoneNumber } = require('@/lib/utils/formatting');
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    expect(formatPhoneNumber('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });

  it('formatCurrency formats USD amounts', () => {
    const { formatCurrency } = require('@/lib/utils/formatting');
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1000.5)).toBe('$1,000.5');
  });

  it('formatRelativeDate handles today/yesterday/tomorrow and others', () => {
    const { formatRelativeDate } = require('@/lib/utils/formatting');
    const now = new Date();
    expect(formatRelativeDate(now)).toMatch(/\d{1,2}:\d{2} (AM|PM)/i);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(formatRelativeDate(tomorrow)).toBe('Tomorrow');
  });
  
  it('formatRelativeDate returns distance for dates within a week', () => {
    const { formatRelativeDate } = require('@/lib/utils/formatting');
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const s = formatRelativeDate(threeDaysAgo);
    expect(typeof s).toBe('string');
    expect(s.toLowerCase().includes('ago')).toBe(true);
  });
  
  it('formatRelativeDate returns date string for older than a week', () => {
    const { formatRelativeDate } = require('@/lib/utils/formatting');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const s = formatRelativeDate(thirtyDaysAgo);
    expect(s).toMatch(/^[A-Za-z]{3} \d{1,2}(, \d{4})?$/);
  });
  
  it('formatRelativeDate returns MMM d for same-year older-than-week', () => {
    const { formatRelativeDate } = require('@/lib/utils/formatting');
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-15T00:00:00Z'));
    const d = new Date('2026-06-01T00:00:00Z');
    const s = formatRelativeDate(d);
    expect(s).toMatch(/^[A-Za-z]{3} \d{1,2}$/);
    jest.useRealTimers();
  });

  it('formatRelativeDate returns full date for previous years', () => {
    const { formatRelativeDate } = require('@/lib/utils/formatting');
    const old = new Date(2000, 0, 1);
    const s = formatRelativeDate(old);
    expect(s).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4}$/);
  });

  it('formatDate returns formatted string', () => {
    const { formatDate } = require('@/lib/utils/formatting');
    const d = '2024-01-02';
    expect(formatDate(d, 'yyyy-MM-dd')).toBe('2024-01-02');
  });

  it('formatRelativeDate accepts ISO string input', () => {
    const { formatRelativeDate } = require('@/lib/utils/formatting');
    const s = formatRelativeDate('2024-01-02T12:00:00Z');
    expect(typeof s).toBe('string');
  });

  it('formatTime converts HH:mm to h:mm a', () => {
    const { formatTime } = require('@/lib/utils/formatting');
    expect(formatTime('14:30')).toBe('2:30 PM');
  });

  it('formatInTimezone formats date in timezone', () => {
    const { formatInTimezone } = require('@/lib/utils/formatting');
    const d = new Date('2024-01-02T12:00:00Z');
    const s = formatInTimezone(d, 'America/New_York', 'yyyy-MM-dd HH:mm');
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });

  it('formatInTimezone accepts string input', () => {
    const { formatInTimezone } = require('@/lib/utils/formatting');
    const s = formatInTimezone('2024-01-02T12:00:00Z', 'UTC', 'yyyy-MM-dd HH:mm');
    expect(typeof s).toBe('string');
  });

  it('getTodayISO returns ISO date string', () => {
    const { getTodayISO } = require('@/lib/utils/formatting');
    const iso = getTodayISO();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatAddress joins parts correctly', () => {
    const { formatAddress } = require('@/lib/utils/formatting');
    expect(formatAddress('123 Main', 'City', 'CA', '90210')).toBe('123 Main, City, CA 90210');
    expect(formatAddress(undefined, 'City', 'CA', null)).toBe('City, CA');
    expect(formatAddress(undefined, undefined, undefined, '90210')).toBe('90210');
  });

  it('formatFileSize converts bytes to human-readable', () => {
    const { formatFileSize } = require('@/lib/utils/formatting');
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});
