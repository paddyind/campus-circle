import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campuscircle.app',
  appName: 'CampusCircle',
  webDir: 'build',
  // Allow HTTP API calls from the app on same-WiFi (e.g. http://YOUR_IP:8000/api). Keep for local; use HTTPS in production.
  android: {
    allowMixedContent: true,
  },
  server: {
    cleartext: true,
  },
};

export default config;
