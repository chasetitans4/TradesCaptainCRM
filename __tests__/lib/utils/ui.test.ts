import { describe, it, expect, jest } from '@jest/globals';

describe('utils/ui', () => {
  it('capitalize capitalizes first letter', () => {
    const { capitalize } = require('@/lib/utils/ui');
    expect(capitalize('hello')).toBe('Hello');
  });

  it('getInitials returns two-letter initials', () => {
    const { getInitials } = require('@/lib/utils/ui');
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('truncate adds ellipsis when exceeding length', () => {
    const { truncate } = require('@/lib/utils/ui');
    expect(truncate('abcdefg', 5)).toBe('ab...');
    expect(truncate('short', 10)).toBe('short');
  });

  it('getGreeting returns a valid greeting', () => {
    const { getGreeting } = require('@/lib/utils/ui');
    const g = getGreeting();
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(g);
  });
  
  it('getGreeting returns Good morning before noon', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1, 9, 0, 0));
    const { getGreeting } = require('@/lib/utils/ui');
    expect(getGreeting()).toBe('Good morning');
    jest.useRealTimers();
  });
  
  it('getGreeting returns Good afternoon before 5pm', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1, 13, 0, 0));
    const { getGreeting } = require('@/lib/utils/ui');
    expect(getGreeting()).toBe('Good afternoon');
    jest.useRealTimers();
  });
  
  it('getGreeting returns Good evening after 5pm', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1, 19, 0, 0));
    const { getGreeting } = require('@/lib/utils/ui');
    expect(getGreeting()).toBe('Good evening');
    jest.useRealTimers();
  });

  it('getStatusLabel maps statuses to labels', () => {
    const { getStatusLabel } = require('@/lib/utils/ui');
    expect(getStatusLabel('in_progress')).toBe('In Progress');
    expect(getStatusLabel('new')).toBe('New');
    expect(getStatusLabel('custom_status')).toBe('Custom status');
  });

  it('getUrgencyColorFromLevel returns expected classes', () => {
    const { getUrgencyColorFromLevel } = require('@/lib/utils/ui');
    expect(getUrgencyColorFromLevel('emergency')).toBe('text-danger bg-danger/10');
    expect(getUrgencyColorFromLevel('low')).toBe('text-text-muted bg-muted');
    expect(getUrgencyColorFromLevel('high')).toBe('text-warning bg-warning/10');
    expect(getUrgencyColorFromLevel('normal')).toBe('text-info bg-info/10');
  });

  it('getUrgencyColor returns classes based on date proximity', () => {
    const { getUrgencyColor } = require('@/lib/utils/ui');
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const soon = new Date(Date.now() + 30 * 60 * 1000);
    const today = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const later = new Date(Date.now() + 48 * 60 * 60 * 1000);
    expect(getUrgencyColor(past).text).toBe('text-danger');
    expect(getUrgencyColor(soon).text).toBe('text-warning');
    expect(getUrgencyColor(today).text).toBe('text-info');
    expect(getUrgencyColor(later).text).toBe('text-text-muted');
  });

  it('calculatePercentage returns rounded percentage and handles zero total', () => {
    const { calculatePercentage } = require('@/lib/utils/ui');
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(0, 0)).toBe(0);
  });
});
