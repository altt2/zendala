import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zendala.app',
  appName: 'Zendala',
  webDir: 'dist/public',
  server: {
    // Allow loading from file:// and cross-origin requests to API
    androidScheme: 'https'
  },
  plugins: {
    // SplashScreen configuration (optional)
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
