import type { Exercise, LoadTarget, Routine, SetType } from '../db/types';
import { englishName } from './exerciseNamesEn';
import { groupSets } from './routineImport';

// Exportar una rutina como texto legible o tabla (CSV para Excel), en español o inglés.
// Ambos formatos se pueden volver a importar en la app (pestañas Texto y Archivo).

export type ExportLang = 'es' | 'en';

const WORDS = {
  es: {
    rest: 'descanso',
    type: { warmup: 'calentamiento', working: '', top: 'top set', backoff: 'back-off', failure: 'al fallo' },
    csvType: { warmup: 'Calentamiento', working: '', top: 'Top', backoff: 'Back-off', failure: 'Fallo' },
    headers: ['Día', 'Ejercicio', 'Series', 'Reps', 'Carga', 'Descanso', 'Tipo', 'Notas'],
    legend: '@8 = RPE 8 · 75% = % del 1RM',
  },
  en: {
    rest: 'rest',
    type: { warmup: 'warm-up', working: '', top: 'top set', backoff: 'back-off', failure: 'to failure' },
    csvType: { warmup: 'Warm-up', working: '', top: 'Top set', backoff: 'Back-off', failure: 'To failure' },
    headers: ['Day', 'Exercise', 'Sets', 'Reps', 'Load', 'Rest', 'Type', 'Notes'],
    legend: '@8 = RPE 8 · 75% = % of 1RM',
  },
} satisfies Record<ExportLang, { type: Record<SetType, string>; [k: string]: unknown }>;

const DAYS_EN: Record<string, string> = {
  lunes: 'Monday',
  martes: 'Tuesday',
  miercoles: 'Wednesday',
  jueves: 'Thursday',
  viernes: 'Friday',
  sabado: 'Saturday',
  domingo: 'Sunday',
};

const plain = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** "Día 1" → "Day 1", "Lunes" → "Monday"; el resto de nombres se dejan como están. */
export function translateDayName(name: string, lang: ExportLang): string {
  if (lang === 'es') return name;
  return name
    .replace(/^d[ií]a\b/i, 'Day')
    .replace(/\p{L}+/gu, (w) => DAYS_EN[plain(w)] ?? w)
    .replace(/\bsesi[oó]n\b/i, 'Session')
    .replace(/\bsemana\b/i, 'Week');
}

export function exerciseName(e: Exercise | undefined, lang: ExportLang): string {
  if (!e) return '?';
  return lang === 'en' ? englishName(e.name) : e.name;
}

function num(n: number, lang: ExportLang): string {
  const s = String(Math.round(n * 100) / 100);
  return lang === 'es' ? s.replace('.', ',') : s;
}

function load(t: LoadTarget | undefined, lang: ExportLang, csv = false): string {
  if (!t) return '';
  switch (t.kind) {
    case 'pct1rm':
      return `${num(t.pct, lang)}%`;
    case 'rpe':
      return csv ? `RPE ${num(t.rpe, lang)}` : `@${num(t.rpe, lang)}`;
    case 'kg':
      return `${num(t.kg, lang)} kg`;
  }
}

function rest(sec: number): string {
  if (sec % 60 === 0) return `${sec / 60} min`;
  if (sec > 60) return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  return `${sec} s`;
}

/**
 * Texto para WhatsApp o notas. Una línea por ejercicio:
 *   Back squat: 1x3 @8 top set, 3x5 75% back-off, rest 3 min // notas
 */
export function routineToText(routine: Routine, exercises: Map<number, Exercise>, lang: ExportLang): string {
  const w = WORDS[lang];
  const lines = [routine.name];
  for (const day of routine.days) {
    lines.push('', `${translateDayName(day.name, lang)}:`);
    for (const pe of day.exercises) {
      const parts = groupSets(pe.sets).map(({ count, set }) =>
        [`${count}x${set.reps}`, load(set.target, lang), w.type[set.type]].filter(Boolean).join(' '),
      );
      if (pe.restSec) parts.push(`${w.rest} ${rest(pe.restSec)}`);
      const note = pe.notes?.trim() ? ` // ${pe.notes.trim().replace(/\s*\n\s*/g, ' ')}` : '';
      lines.push(`${exerciseName(exercises.get(pe.exerciseId), lang)}: ${parts.join(', ')}${note}`);
    }
  }
  lines.push('', w.legend);
  return lines.join('\n');
}

/** CSV con una fila por grupo de series. Español: “;” (Excel en español); inglés: “,”. */
export function routineToCsv(routine: Routine, exercises: Map<number, Exercise>, lang: ExportLang): string {
  const w = WORDS[lang];
  const sep = lang === 'es' ? ';' : ',';
  const cell = (v: string | number) => {
    const s = String(v);
    return s.includes(sep) || /["\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: (string | number)[][] = [w.headers];
  for (const day of routine.days) {
    const dayName = translateDayName(day.name, lang);
    for (const pe of day.exercises) {
      const name = exerciseName(exercises.get(pe.exerciseId), lang);
      groupSets(pe.sets).forEach(({ count, set }, i) => {
        rows.push([
          dayName,
          name,
          count,
          set.reps,
          load(set.target, lang, true),
          pe.restSec ? rest(pe.restSec) : '',
          w.csvType[set.type],
          i === 0 ? (pe.notes ?? '') : '',
        ]);
      });
    }
  }
  return rows.map((r) => r.map(cell).join(sep)).join('\r\n');
}
