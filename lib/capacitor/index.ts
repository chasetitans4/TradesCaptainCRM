/**
 * Capacitor Native Access Module
 *
 * Unified interface for native device capabilities across iOS, Android, and web.
 * Automatically falls back to web APIs when native plugins are unavailable.
 *
 * Usage:
 *   import { capturePhoto, getCurrentPosition, initializePush } from '@/lib/capacitor';
 */

// Platform detection
export {
  getPlatform,
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  isPluginAvailable,
  getSafeAreaInsets,
  logPlatformInfo,
  type Platform,
} from './platform';

// Camera
export {
  capturePhoto,
  pickPhotos,
  isCameraAvailable,
  requestCameraPermission,
  checkCameraPermission,
  type CapturedPhoto,
  type CameraOptions,
} from './camera';

// Geolocation
export {
  getCurrentPosition,
  watchPosition,
  clearWatch,
  isGeolocationAvailable,
  requestGeolocationPermission,
  checkGeolocationPermission,
  calculateDistance,
  isWithinRadius,
  type GeoPosition,
  type GeoResult,
  type GeoError,
  type GeoOptions,
} from './geolocation';

// Push Notifications
export {
  initializePush,
  registerPush,
  isPushAvailable,
  requestPushPermission,
  checkPushPermission,
  onPushReceived,
  onPushTapped,
  onPushToken,
  onPushError,
  getDeliveredNotifications,
  removeDeliveredNotifications,
  removeAllDeliveredNotifications,
  createNotificationChannel,
  type PushToken,
  type PushNotification,
  type PushActionResult,
} from './push-notifications';
