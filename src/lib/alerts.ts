// Alertas del temporizador de descanso, optimizadas para Chrome Android:
//  - Pitido con Web Audio (no requiere archivo, funciona offline). El AudioContext
//    se “desbloquea” en el gesto del usuario al completar una serie.
//  - navigator.vibrate (Android sí lo soporta; iOS no).
//  - Notificación del sistema vía service worker: única forma de notificar en
//    Chrome Android (new Notification() lanza error allí). Con la pantalla
//    bloqueada es lo que hace vibrar/sonar el teléfono.
//  - En la APK (Capacitor) la notificación se programa como alarma nativa al
//    empezar el descanso: suena aunque Android congele o cierre la app.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNativeApp = Capacitor.isNativePlatform();
const REST_ID = 1;
const REST_CHANNEL = 'rest';

// Las llamadas al puente nativo se encadenan para que un “cancelar” nunca
// adelante a un “programar” posterior.
let nativeQueue: Promise<unknown> = Promise.resolve();
function enqueue(fn: () => Promise<unknown>) {
  nativeQueue = nativeQueue.then(fn).catch(() => undefined);
}

let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Tres pitidos: corto, corto, largo. */
export function beep() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const tones: [start: number, dur: number, freq: number][] = [
    [0, 0.15, 880],
    [0.25, 0.15, 880],
    [0.5, 0.45, 1320],
  ];
  for (const [start, dur, freq] of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  }
}

export const VIBRATE_REST_DONE = [250, 120, 250, 120, 600];

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sin soporte */
  }
}

export function notificationsSupported(): boolean {
  return isNativeApp || ('Notification' in window && 'serviceWorker' in navigator);
}

/** true si el usuario bloqueó las notificaciones (no tiene sentido volver a pedirlas). */
export async function notificationsDenied(): Promise<boolean> {
  if (isNativeApp) return (await LocalNotifications.checkPermissions()).display === 'denied';
  return notificationsSupported() && Notification.permission === 'denied';
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (isNativeApp) {
    const res = await LocalNotifications.requestPermissions();
    if (res.display !== 'granted') return false;
    await LocalNotifications.createChannel({
      id: REST_CHANNEL,
      name: 'Fin del descanso',
      description: 'Aviso cuando termina el descanso entre series',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    return true;
  }
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

type AndroidNotificationOptions = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
};

/** APK: programa la alarma nativa para endsAt (reemplaza la anterior). */
export function scheduleRestNotification(endsAt: number) {
  if (!isNativeApp) return;
  enqueue(async () => {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_ID,
          title: 'Descanso terminado',
          body: 'Hora de la siguiente serie',
          channelId: REST_CHANNEL,
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
        },
      ],
    });
  });
}

export async function showRestNotification() {
  if (isNativeApp) return; // ya programada como alarma nativa
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const options: AndroidNotificationOptions = {
    body: 'Hora de la siguiente serie',
    tag: 'rest-timer',
    renotify: true,
    silent: false,
    vibrate: VIBRATE_REST_DONE,
  };
  await reg.showNotification('Descanso terminado', options);
}

export async function clearRestNotification() {
  if (isNativeApp) {
    enqueue(async () => {
      await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
      await LocalNotifications.removeDeliveredNotifications({ notifications: [{ id: REST_ID, title: '', body: '' }] });
    });
    return;
  }
  if (!notificationsSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const list = await reg?.getNotifications({ tag: 'rest-timer' });
  list?.forEach((n) => n.close());
}
