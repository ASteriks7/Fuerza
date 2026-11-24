import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './index.css';

registerSW({ immediate: true });

// Pide almacenamiento persistente para que Android no borre IndexedDB
// cuando el dispositivo se quede sin espacio.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
