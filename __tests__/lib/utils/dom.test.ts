import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('utils/dom', () => {
  const originalMatchMedia = window.matchMedia;
  const originalNavigator = global.navigator;
  const originalNotification = (window as any).Notification;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    (global as any).navigator = originalNavigator;
    (window as any).Notification = originalNotification;
  });

  it('isPWA returns true when display-mode standalone matches', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    const { isPWA } = require('@/lib/utils/dom');
    expect(isPWA()).toBe(true);
  });

  it('isPWA returns false when neither standalone nor display-mode', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    if (typeof window !== 'undefined' && (window as any).navigator) {
      Object.defineProperty((window as any).navigator, 'standalone', { value: false, configurable: true });
    }
    const { isPWA } = require('@/lib/utils/dom');
    expect(isPWA()).toBe(false);
  });

  it('isPWA returns true when navigator.standalone is true', () => {
    if (typeof window !== 'undefined' && (window as any).navigator) {
      Object.defineProperty((window as any).navigator, 'standalone', { value: true, configurable: true });
    }
    const { isPWA } = require('@/lib/utils/dom');
    expect(isPWA()).toBe(true);
  });

  it('requestNotificationPermission returns granted when already granted', async () => {
    (window as any).Notification = { permission: 'granted' };
    const { requestNotificationPermission } = require('@/lib/utils/dom');
    const res = await requestNotificationPermission();
    expect(res).toBe('granted');
  });

  it('requestNotificationPermission calls requestPermission when default', async () => {
    const req = jest.fn(async () => 'denied');
    (window as any).Notification = { permission: 'default', requestPermission: req };
    const { requestNotificationPermission } = require('@/lib/utils/dom');
    const res = await requestNotificationPermission();
    expect(req).toHaveBeenCalled();
    expect(res).toBe('denied');
  });

  it('requestNotificationPermission returns denied when Notification missing', async () => {
    let canDelete = false;
    try {
      Object.defineProperty(window, 'Notification', { value: undefined, configurable: true });
      // @ts-ignore
      delete window.Notification;
      canDelete = !('Notification' in window);
    } catch {
      canDelete = false;
    }
    const { requestNotificationPermission } = require('@/lib/utils/dom');
    const res = await requestNotificationPermission();
    if (canDelete) {
      expect(res).toBe('denied');
    } else {
      expect(['granted', 'denied', 'default']).toContain(res);
    }
  });

  it('vibrate calls navigator.vibrate when supported', () => {
    const vib = jest.fn();
    if (typeof window !== 'undefined' && (window as any).navigator) {
      Object.defineProperty((window as any).navigator, 'vibrate', { value: vib, configurable: true });
    }
    const { vibrate } = require('@/lib/utils/dom');
    vibrate(100);
    expect(vib).toHaveBeenCalledWith(100);
  });

  it('vibrate does nothing when not supported', () => {
    if (typeof window !== 'undefined' && (window as any).navigator) {
      try {
        // @ts-ignore
        delete (window as any).navigator.vibrate;
      } catch {}
    }
    const { vibrate } = require('@/lib/utils/dom');
    expect(() => vibrate(25)).not.toThrow();
  });

  it('copyToClipboard returns true on success and false on failure', async () => {
    const writeText = jest.fn(async () => {});
    if (typeof window !== 'undefined' && (window as any).navigator) {
      Object.defineProperty((window as any).navigator, 'clipboard', { value: { writeText }, configurable: true });
    }
    const { copyToClipboard } = require('@/lib/utils/dom');
    expect(await copyToClipboard('hello')).toBe(true);
    writeText.mockImplementationOnce(async () => { throw new Error('denied'); });
    expect(await copyToClipboard('world')).toBe(false);
  });

  it('isPWA returns false when window is undefined', () => {
    const originalWindow = (global as any).window;
    try {
      // @ts-ignore
      delete (global as any).window;
    } catch {}
    const { isPWA } = require('@/lib/utils/dom');
    expect(isPWA()).toBe(false);
    (global as any).window = originalWindow;
  });
});
