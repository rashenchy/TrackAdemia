import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackademia.app',
  appName: 'TrackAdemia',
  webDir: 'public',
  server: {
    // 1. Put the exact final URL that appears in your browser address bar (no trailing slash)
    url: 'http://track-ademia.vercel.app/',
    cleartext: false,
    
    // 2. This prevents Capacitor from kicking out to Chrome
    allowNavigation: [
      'http://track-ademia.vercel.app/',
      '*.vercel.app',
      '*.supabase.co'
    ]
  }
};

export default config;