import { db } from './schema';

const TABLES = ['exercises', 'routines', 'workouts', 'sets', 'settings'] as const;
type TableName = (typeof TABLES)[number];

export interface Backup {
  app: 'fuerza';
  version: 1;
  exportedAt: string;
  tables: Record<TableName, unknown[]>;
}

export async function exportBackup(): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>;
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) tables[t] = await db.table(t).toArray();
  });
  return { app: 'fuerza', version: 1, exportedAt: new Date().toISOString(), tables };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const b = data as Partial<Backup>;
  if (b?.app !== 'fuerza' || b.version !== 1 || typeof b.tables !== 'object' || !b.tables) {
    throw new Error('El archivo no es un respaldo de Fuerza.');
  }
  for (const t of TABLES) {
    if (!Array.isArray(b.tables[t])) throw new Error(`Falta la tabla "${t}" en el respaldo.`);
  }
  return b as Backup;
}

/** Reemplaza TODOS los datos locales por los del respaldo (en una transacción). */
export async function importBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      await db.table(t).bulkAdd(backup.tables[t]);
    }
  });
}
