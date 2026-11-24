import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';

export interface AppSettings {
  /** Descanso tras series efectivas / top / back-off / fallo (s). */
  restWorkingSec: number;
  /** Descanso tras series de calentamiento (s). */
  restWarmupSec: number;
  restSound: boolean;
  restVibrate: boolean;
  /** Notificación del sistema al terminar el descanso con la app en segundo plano. */
  restNotify: boolean;
  /** Wake lock durante el entrenamiento. */
  keepScreenOn: boolean;
  /** Discos disponibles (kg). Se asume cantidad ilimitada de pares. */
  availablePlates: number[];
  /** Redondeo de cargas calculadas por % (kg). */
  loadIncrement: number;
}

export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export const DEFAULT_SETTINGS: AppSettings = {
  restWorkingSec: 180,
  restWarmupSec: 90,
  restSound: true,
  restVibrate: true,
  restNotify: false,
  keepScreenOn: true,
  availablePlates: ALL_PLATES,
  loadIncrement: 2.5,
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray();
  return merge(rows);
}

export function useSettings(): AppSettings {
  const rows = useLiveQuery(() => db.settings.toArray(), []);
  return merge(rows ?? []);
}

export async function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  await db.settings.put({ key, value });
}

function merge(rows: { key: string; value: unknown }[]): AppSettings {
  const out: AppSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (key in out) (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}
