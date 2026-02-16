import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tradescaptain.crm',
  appName: 'Trades Captain',
  webDir: 'out',
  server: {
    // Use HTTPS scheme for Android to enable secure contexts
    androidScheme: 'https',
    // Allow cleartext in development only
    cleartext: process.env.NODE_ENV === 'development',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
    },
    Camera: {
      // Camera configuration
    },
    Geolocation: {
      // Geolocation configuration
    },
  },
  // iOS configuration
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    // Enable background location for check-in/check-out
    backgroundColor: '#1a1a2e',
  },
  // Android configuration
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    backgroundColor: '#1a1a2e',
  },
};

export default config;
