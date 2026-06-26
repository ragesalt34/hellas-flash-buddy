import type { CapacitorConfig } from '@capacitor/cli';

// Native iOS shell for the Hellas Study Mini App (personal sideload build).
// The web UI is bundled from `dist`; backend data is fetched over the network
// from VITE_API_BASE (set at build time — see CAPACITOR.md).
const config: CapacitorConfig = {
  appId: 'study.hellas.app',
  appName: 'Hellas Study',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#15141b',
  },
};

export default config;
