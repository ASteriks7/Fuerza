import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { isNativeApp } from './lib/alerts';
import './index.css';

// En la APK los archivos ya van dentro de la app: no hace falta service worker.
if (!isNativeApp) registerSW({ immediate: true });

// Pide almacenamiento persistente para que Android no borre IndexedDB
// cuando el dispositivo se quede sin espacio.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
