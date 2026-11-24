import type { CapacitorConfig } from '@capacitor/cli';

// Envoltorio Android (APK). La web se compila con base '/' y se empaqueta dentro de la app:
// funciona sin internet y no depende de GitHub Pages.
const config: CapacitorConfig = {
  appId: 'io.github.asteriks7.fuerza',
  appName: 'Fuerza',
  webDir: 'dist',
  backgroundColor: '#0b0b0d',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rest',
      iconColor: '#c6f432',
    },
  },
};

export default config;
