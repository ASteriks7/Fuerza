// Alertas del temporizador de descanso, optimizadas para Chrome Android:
//  - Pitido con Web Audio (no requiere archivo, funciona offline). El AudioContext
//    se “desbloquea” en el gesto del usuario al completar una serie.
//  - navigator.vibrate (Android sí lo soporta; iOS no).
//  - Notificación del sistema vía service worker: única forma de notificar en
//    Chrome Android (new Notification() lanza error allí). Con la pantalla
//    bloqueada es lo que hace vibrar/sonar el teléfono.

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
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

type AndroidNotificationOptions = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
};

export async function showRestNotification() {
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
  if (!notificationsSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const list = await reg?.getNotifications({ tag: 'rest-timer' });
  list?.forEach((n) => n.close());
}
