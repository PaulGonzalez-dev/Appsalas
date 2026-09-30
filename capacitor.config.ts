import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.playr.app',
  appName: 'Playr',
  webDir: 'client/dist',
  backgroundColor: '#edf0f5',
  iconBackgroundColor: '#edf0f5',
  splashBackgroundColor: '#edf0f5',
  splashDarkBackgroundColor: '#020305',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#edf0f5',
      launchShowDuration: 1500,
      launchAutoHide: true,
      showSpinner: false,
    },
  },
};

export default config;
