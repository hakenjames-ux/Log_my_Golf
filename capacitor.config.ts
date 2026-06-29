import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.logmygolf.app',
  appName: 'Log My Golf',
  webDir: 'dist',
  backgroundColor: '#0a0a0b',
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a0b',
  },
  android: {
    backgroundColor: '#0a0a0b',
  },
  // To load the LIVE site instead of the bundled dist/ (instant updates, no
  // re-review for content changes), uncomment — but Apple may scrutinise pure
  // web wrappers, so the bundled-dist default is the safer route for review:
  // server: { url: 'https://logmygolf.com', cleartext: false },
};

export default config;
