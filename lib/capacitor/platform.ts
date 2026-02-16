/**
 * Platform Detection Utilities
 *
 * Provides utilities for detecting the current platform (web, iOS, Android)
 * and checking for native Capacitor capabilities.
 */

import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  if (!Capacitor.isNativePlatform()) {
    return 'web';
  }
  return Capacitor.getPlatform() as 'ios' | 'android';
}

/**
 * Check if running on a native platform (iOS or Android)
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if running in a web browser (not native)
 */
export function isWeb(): boolean {
  return !Capacitor.isNativePlatform();
}

/**
 * Check if a specific plugin is available
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Get platform-specific safe area insets
 * Returns CSS values for safe area padding
 */
export function getSafeAreaInsets(): {
  top: string;
  bottom: string;
  left: string;
  right: string;
} {
  if (isNative()) {
    return {
      top: 'env(safe-area-inset-top, 0px)',
      bottom: 'env(safe-area-inset-bottom, 0px)',
      left: 'env(safe-area-inset-left, 0px)',
      right: 'env(safe-area-inset-right, 0px)',
    };
  }
  return {
    top: '0px',
    bottom: '0px',
    left: '0px',
    right: '0px',
  };
}

/**
 * Platform-aware logging
 */
export function logPlatformInfo(): void {
  console.log('[Capacitor] Platform:', getPlatform());
  console.log('[Capacitor] Is Native:', isNative());
  console.log('[Capacitor] Camera Available:', isPluginAvailable('Camera'));
  console.log('[Capacitor] Geolocation Available:', isPluginAvailable('Geolocation'));
  console.log('[Capacitor] PushNotifications Available:', isPluginAvailable('PushNotifications'));
}
