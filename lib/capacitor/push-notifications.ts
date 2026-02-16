/**
 * Push Notifications Wrapper
 *
 * Provides a unified interface for push notifications across native and web platforms.
 * On native platforms, uses Capacitor PushNotifications plugin.
 * On web, uses the Web Push API (if available).
 */

import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
  type Token,
} from '@capacitor/push-notifications';
import { isNative, isPluginAvailable, isIOS, isAndroid } from './platform';

export interface PushToken {
  /** The push notification token */
  value: string;
  /** Platform-specific token type */
  type: 'fcm' | 'apns' | 'web';
}

export interface PushNotification {
  /** Notification ID */
  id: string;
  /** Notification title */
  title?: string;
  /** Notification body */
  body?: string;
  /** Additional data payload */
  data: Record<string, unknown>;
  /** Badge count (iOS only) */
  badge?: number;
}

export interface PushActionResult {
  /** The action ID that was performed */
  actionId: string;
  /** The notification that was acted upon */
  notification: PushNotification;
  /** Input text (if action included text input) */
  inputValue?: string;
}

type NotificationHandler = (notification: PushNotification) => void;
type TokenHandler = (token: PushToken) => void;
type ActionHandler = (action: PushActionResult) => void;
type ErrorHandler = (error: Error) => void;

// Event handlers
let onNotificationReceived: NotificationHandler | null = null;
let onNotificationTapped: ActionHandler | null = null;
let onTokenReceived: TokenHandler | null = null;
let onRegistrationError: ErrorHandler | null = null;
let listenersRegistered = false;

/**
 * Check if push notifications are available
 */
export function isPushAvailable(): boolean {
  if (isNative()) {
    return isPluginAvailable('PushNotifications');
  }
  return 'Notification' in window && 'PushManager' in window;
}

/**
 * Request push notification permissions
 * @returns Whether permission was granted
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isPushAvailable()) {
    return false;
  }

  if (isNative()) {
    try {
      const permission = await PushNotifications.requestPermissions();
      console.log('[Push] Permission status:', permission.receive);
      return permission.receive === 'granted';
    } catch (error) {
      console.error('[Push] Permission request failed:', error);
      return false;
    }
  }

  // Web Push API
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[Push] Web permission request failed:', error);
    return false;
  }
}

/**
 * Check push notification permission status
 */
export async function checkPushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isPushAvailable()) {
    return 'denied';
  }

  if (isNative()) {
    try {
      const permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt-with-rationale') {
        return 'prompt';
      }
      return permission.receive;
    } catch (error) {
      console.error('[Push] Permission check failed:', error);
      return 'prompt';
    }
  }

  // Web Push API
  return Notification.permission as 'granted' | 'denied' | 'prompt';
}

/**
 * Register for push notifications and get device token
 */
export async function registerPush(): Promise<PushToken | null> {
  if (!isPushAvailable()) {
    return null;
  }

  // Ensure listeners are set up
  await setupListeners();

  if (isNative()) {
    return new Promise((resolve) => {
      // Set up temporary handler for this registration
      const originalHandler = onTokenReceived;

      onTokenReceived = (token) => {
        resolve(token);
        onTokenReceived = originalHandler;
      };

      // Register
      PushNotifications.register().catch((error) => {
        console.error('[Push] Registration failed:', error);
        resolve(null);
        onTokenReceived = originalHandler;
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (onTokenReceived === null) return;
        resolve(null);
        onTokenReceived = originalHandler;
      }, 10000);
    });
  }

  // Web Push is more complex - requires service worker and VAPID key
  // Return null for now - web push setup requires additional server configuration
  console.log('[Push] Web push registration requires additional setup');
  return null;
}

/**
 * Set up notification listeners
 */
async function setupListeners(): Promise<void> {
  if (listenersRegistered || !isPushAvailable() || !isNative()) {
    return;
  }

  listenersRegistered = true;

  // Registration success
  await PushNotifications.addListener('registration', (token: Token) => {
    console.log('[Push] Registration successful');
    const pushToken: PushToken = {
      value: token.value,
      type: isIOS() ? 'apns' : 'fcm',
    };
    onTokenReceived?.(pushToken);
  });

  // Registration error
  await PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', error);
    onRegistrationError?.(new Error(error.error));
  });

  // Notification received while app is in foreground
  await PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('[Push] Notification received:', notification.id);
      const pushNotification: PushNotification = {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
      };
      onNotificationReceived?.(pushNotification);
    }
  );

  // Notification tapped
  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      console.log('[Push] Notification action:', action.actionId);
      const pushAction: PushActionResult = {
        actionId: action.actionId,
        notification: {
          id: action.notification.id,
          title: action.notification.title,
          body: action.notification.body,
          data: action.notification.data || {},
          badge: action.notification.badge,
        },
        inputValue: action.inputValue,
      };
      onNotificationTapped?.(pushAction);
    }
  );
}

/**
 * Set handler for when a notification is received
 */
export function onPushReceived(handler: NotificationHandler): void {
  onNotificationReceived = handler;
  setupListeners();
}

/**
 * Set handler for when a notification is tapped
 */
export function onPushTapped(handler: ActionHandler): void {
  onNotificationTapped = handler;
  setupListeners();
}

/**
 * Set handler for when registration token is received
 */
export function onPushToken(handler: TokenHandler): void {
  onTokenReceived = handler;
  setupListeners();
}

/**
 * Set handler for registration errors
 */
export function onPushError(handler: ErrorHandler): void {
  onRegistrationError = handler;
  setupListeners();
}

/**
 * Get delivered notifications (iOS 10+ and Android)
 */
export async function getDeliveredNotifications(): Promise<PushNotification[]> {
  if (!isNative() || !isPluginAvailable('PushNotifications')) {
    return [];
  }

  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      data: n.data || {},
      badge: n.badge,
    }));
  } catch (error) {
    console.error('[Push] Failed to get delivered notifications:', error);
    return [];
  }
}

/**
 * Remove specific delivered notifications
 */
export async function removeDeliveredNotifications(ids: string[]): Promise<void> {
  if (!isNative() || !isPluginAvailable('PushNotifications')) {
    return;
  }

  try {
    await PushNotifications.removeDeliveredNotifications({ notifications: ids.map(id => ({ id, tag: '', data: {} })) });
  } catch (error) {
    console.error('[Push] Failed to remove notifications:', error);
  }
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications(): Promise<void> {
  if (!isNative() || !isPluginAvailable('PushNotifications')) {
    return;
  }

  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.error('[Push] Failed to remove all notifications:', error);
  }
}

/**
 * Create channel for Android notifications (Android 8.0+)
 */
export async function createNotificationChannel(
  id: string,
  name: string,
  description: string,
  importance: 'low' | 'default' | 'high' = 'default'
): Promise<void> {
  if (!isAndroid() || !isPluginAvailable('PushNotifications')) {
    return;
  }

  const importanceMap: Record<string, number> = {
    low: 2,
    default: 3,
    high: 4,
  };

  try {
    await PushNotifications.createChannel({
      id,
      name,
      description,
      importance: importanceMap[importance] as any,
      visibility: 1, // Public
      sound: 'default',
      vibration: true,
      lights: true,
    });
    console.log('[Push] Channel created:', id);
  } catch (error) {
    console.error('[Push] Failed to create channel:', error);
  }
}

/**
 * Initialize push notifications with default settings
 * Call this on app startup
 */
export async function initializePush(userId?: string): Promise<PushToken | null> {
  if (!isPushAvailable()) {
    console.log('[Push] Push notifications not available on this platform');
    return null;
  }

  // Request permission
  const hasPermission = await requestPushPermission();
  if (!hasPermission) {
    console.log('[Push] Permission denied');
    return null;
  }

  // Create default channels for Android
  if (isAndroid()) {
    await createNotificationChannel(
      'default',
      'General',
      'General notifications',
      'default'
    );
    await createNotificationChannel(
      'jobs',
      'Job Updates',
      'Notifications about job assignments and status changes',
      'high'
    );
    await createNotificationChannel(
      'messages',
      'Messages',
      'Customer and team messages',
      'high'
    );
  }

  // Register and get token
  const token = await registerPush();

  if (token && userId) {
    // Send token to server for storage
    try {
      await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.value,
          type: token.type,
          userId,
        }),
      });
      console.log('[Push] Token registered with server');
    } catch (error) {
      console.error('[Push] Failed to register token with server:', error);
    }
  }

  return token;
}
