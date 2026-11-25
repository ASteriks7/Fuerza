import type { Equipment, Exercise, ExerciseCategory, LoadTarget, MuscleMap, PlannedSet, Routine, SetType } from '../db/types';
import { englishName, EXERCISE_NAMES_EN } from './exerciseNamesEn';

// Importación de rutinas: texto libre, tablas (CSV / Excel / celdas pegadas) y
// archivos de Fuerza. Todo produce un borrador (RoutineDraft) que el usuario
// revisa antes de guardarlo. Funciones puras: sin base de datos.

export interface ExerciseDefinition {
  name: string;
  /** Nombre en inglés (solo informativo, para quien no habla español). */
  nameEn?: string;
  category: ExerciseCategory;
  equipment: Equipment;
  barWeight?: number;
  muscles?: MuscleMap;
}

export interface DraftExercise {
  /** Nombre tal como venía (para mostrarlo y para crear el ejercicio si no existe). */
  rawName: string;
  /** Coincidencia en la biblioteca; undefined = se creará como ejercicio nuevo. */
  exerciseId?: number;
  /** true si la coincidencia es aproximada (conviene revisarla). */
  fuzzy?: boolean;
  sets: PlannedSet[];
  restSec?: number;
  notes?: string;
  /** Definición completa (archivos de Fuerza) para crearlo igual en este dispositivo. */
  definition?: ExerciseDefinition;
}

export interface DraftDay {
  name: string;
  exercises: DraftExercise[];
}

export interface RoutineDraft {
  name: string;
  days: DraftDay[];
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Coincidencia de nombres                                             */
/* ------------------------------------------------------------------ */

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Nombres habituales (inglés y sinónimos en español) → nombre del catálogo.
const ALIAS_SOURCE: Record<string, string[]> = {
  Sentadilla: ['squat', 'back squat', 'high bar squat', 'sentadilla trasera', 'sentadilla con barra', 'sentadilla trasera con barra', 'sq'],
  'Sentadilla low bar': ['low bar squat', 'low bar'],
  'Sentadilla con pausa': ['pause squat', 'paused squat', 'sentadilla pausa', 'sentadilla pausada'],
  'Sentadilla frontal': ['front squat', 'sentadilla delantera'],
  'Sentadilla a cajón': ['box squat', 'sentadilla al cajon'],
  'Sentadilla con safety bar': ['safety bar squat', 'ssb squat', 'ssb'],
  'Sentadilla Zercher': ['zercher squat', 'zercher'],
  'Sentadilla goblet': ['goblet squat'],
  'Sentadilla hack': ['hack squat'],
  'Sentadilla pistol': ['pistol squat', 'pistol'],
  'Press banca': ['bench', 'bench press', 'banca', 'press de banca', 'press plano', 'press banca plano', 'bp'],
  'Press banca con pausa larga': ['paused bench', 'pause bench', 'press banca con pausa', 'press banca pausa', 'banca con pausa'],
  'Press banca agarre cerrado': ['close grip bench', 'close grip bench press', 'cgbp', 'banca agarre cerrado'],
  'Press banca Larsen': ['larsen press'],
  'Press banca Spoto': ['spoto press'],
  'Press de suelo': ['floor press'],
  'Press banca desde pines': ['pin press', 'bench pin press'],
  'Press inclinado con barra': ['incline bench press', 'incline press', 'press inclinado', 'press banca inclinado'],
  'Press inclinado con mancuernas': ['incline dumbbell press'],
  'Press banca con mancuernas': ['dumbbell bench press', 'db bench'],
  'Fondos en paralelas': ['dips', 'fondos'],
  'Peso muerto': ['deadlift', 'conventional deadlift', 'dl', 'muerto', 'peso muerto convencional'],
  'Peso muerto sumo': ['sumo deadlift', 'sumo'],
  'Peso muerto con déficit': ['deficit deadlift'],
  'Peso muerto con pausa': ['paused deadlift', 'pause deadlift'],
  'Peso muerto rumano': ['romanian deadlift', 'rdl'],
  'Peso muerto piernas rígidas': ['stiff leg deadlift', 'sldl'],
  'Peso muerto agarre de arrancada': ['snatch grip deadlift'],
  'Peso muerto desde bloques': ['block pull', 'block deadlift'],
  'Peso muerto con barra hexagonal': ['trap bar deadlift', 'hex bar deadlift', 'peso muerto trap bar'],
  'Buenos días': ['good morning', 'good mornings'],
  // Halterofilia
  Arrancada: ['snatch', 'full snatch', 'squat snatch', 'arranque'],
  'Arrancada de potencia': ['power snatch', 'arrancada en potencia'],
  'Arrancada colgante': ['hang snatch', 'arrancada desde colgado'],
  'Arrancada colgante de potencia': ['hang power snatch'],
  'Arrancada desde bloques': ['block snatch', 'snatch from blocks'],
  'Sentadilla de arrancada (overhead squat)': ['overhead squat', 'ohs', 'sentadilla overhead', 'sentadilla de arrancada', 'sentadilla sobre cabeza'],
  'Tirón de arrancada': ['snatch pull', 'tiron de arranque'],
  Cargada: ['clean', 'full clean', 'squat clean'],
  'Cargada de potencia': ['power clean', 'cargada en potencia'],
  'Cargada colgante': ['hang clean', 'cargada desde colgado'],
  'Cargada colgante de potencia': ['hang power clean'],
  'Cargada desde bloques': ['block clean', 'clean from blocks'],
  'Tirón de cargada': ['clean pull'],
  'Tirón alto': ['high pull', 'snatch high pull', 'clean high pull'],
  'Dos tiempos (cargada y envión)': ['clean and jerk', 'clean jerk', 'c j', 'cj', 'dos tiempos', 'cargada y envion'],
  'Envión en tijera': ['jerk', 'split jerk', 'envion', 'envion tijera'],
  'Envión de potencia': ['power jerk', 'push jerk'],
  'Envión desde rack': ['jerk from rack', 'rack jerk', 'jerk desde rack', 'envion de rack'],
  // Hombro, espalda, accesorios
  'Press militar': ['overhead press', 'ohp', 'military press', 'strict press', 'press de hombros', 'press estricto'],
  'Push press': ['press de empuje'],
  'Press de hombro con mancuernas': ['dumbbell shoulder press', 'db shoulder press'],
  'Remo con barra': ['barbell row', 'bent over row', 'remo inclinado'],
  'Remo Pendlay': ['pendlay row'],
  Dominadas: ['pull up', 'pull ups', 'pullups', 'chin up', 'chin ups', 'dominada'],
  'Jalón al pecho': ['lat pulldown', 'pulldown', 'jalon'],
  'Remo con mancuerna': ['dumbbell row', 'db row'],
  'Remo en polea baja': ['seated cable row', 'cable row'],
  'Hip thrust': ['empuje de cadera'],
  'Prensa de piernas': ['leg press', 'prensa'],
  'Sentadilla búlgara': ['bulgarian split squat', 'bulgaras'],
  Zancadas: ['lunges', 'lunge', 'estocadas'],
  'Curl femoral': ['leg curl', 'hamstring curl'],
  'Extensión de cuádriceps': ['leg extension'],
  'Elevación de gemelos': ['calf raise', 'calf raises', 'gemelos'],
  'Curl con barra': ['barbell curl', 'curl biceps'],
  'Extensión de tríceps en polea': ['tricep pushdown', 'triceps pushdown', 'pushdown'],
  'Press francés': ['skull crusher', 'skullcrusher'],
  'Elevaciones laterales': ['lateral raise', 'lateral raises'],
  'Face pull': ['face pulls'],
  Plancha: ['plank'],
  'Rueda abdominal': ['ab wheel', 'ab rollout'],
  'Elevación de piernas colgado': ['hanging leg raise', 'hanging leg raises'],
  // Pliometría
  'Salto al cajón': ['box jump', 'box jumps', 'saltos al cajon'],
  'Salto vertical': ['vertical jump', 'cmj', 'countermovement jump', 'salto con contramovimiento'],
  'Sentadilla con salto': ['jump squat', 'jump squats', 'squat jump'],
  'Salto con rodillas al pecho': ['tuck jump', 'tuck jumps'],
  'Salto de longitud': ['broad jump', 'long jump', 'salto horizontal'],
  'Salto en profundidad (drop jump)': ['depth jump', 'drop jump', 'salto en profundidad'],
  'Saltos de vallas': ['hurdle hops', 'hurdle jumps', 'saltos de valla'],
  'Saltos alternos (bounding)': ['bounding', 'bounds'],
  'Saltos laterales de patinador': ['skater jumps', 'skaters', 'saltos de patinador'],
  'Salto con barra hexagonal': ['trap bar jump', 'hex bar jump'],
  'Flexiones pliométricas': ['clap push up', 'clap push ups', 'plyo push up', 'plyo push ups', 'flexiones con palmada'],
  'Lanzamiento de balón medicinal al pecho': ['med ball chest pass', 'medicine ball chest pass', 'chest pass'],
  'Lanzamiento de balón medicinal hacia atrás': ['med ball backward throw', 'overhead backward throw', 'scoop toss'],
  'Slam con balón medicinal': ['med ball slam', 'ball slam', 'slam'],
  'Swing con kettlebell': ['kettlebell swing', 'kb swing', 'swing ruso', 'swing'],
};

const ALIASES = new Map<string, string>();
for (const [target, list] of Object.entries(ALIAS_SOURCE)) {
  for (const a of list) ALIASES.set(normalizeName(a), normalizeName(target));
}
// Nombres en inglés del catálogo (los que usa la exportación en inglés).
for (const [es, en] of Object.entries(EXERCISE_NAMES_EN)) {
  const k = normalizeName(en);
  if (k !== normalizeName(es) && !ALIASES.has(k)) ALIASES.set(k, normalizeName(es));
}

const STOP = new Set(['con', 'de', 'del', 'la', 'el', 'a', 'al', 'en', 'y', 'the', 'with', 'of']);
const tokens = (n: string) => n.split(' ').filter((t) => t && !STOP.has(t));
const singular = (n: string) =>
  n
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');

export interface ExerciseMatch {
  id: number;
  fuzzy: boolean;
}

/** Busca un ejercicio por nombre: exacto → alias → singular → aproximado. */
export function matchExercise(raw: string, exercises: Exercise[]): ExerciseMatch | undefined {
  const n = normalizeName(raw);
  if (!n) return undefined;
  // Preferir ejercicios visibles a los ocultos.
  const sorted = [...exercises].sort((a, b) => a.archived - b.archived);
  const byName = new Map<string, Exercise>();
  for (const e of sorted) {
    const k = normalizeName(e.name);
    if (!byName.has(k)) byName.set(k, e);
  }
  for (const candidate of [n, singular(n)]) {
    const exact = byName.get(candidate) ?? byName.get(ALIASES.get(candidate) ?? '');
    if (exact) return { id: exact.id, fuzzy: false };
  }
  // Aproximado: coincidencia de palabras (Dice) ≥ 0,66.
  const tn = tokens(singular(n));
  let best: { e: Exercise; score: number } | undefined;
  for (const [k, e] of byName) {
    const tk = tokens(singular(k));
    if (!tk.length || !tn.length) continue;
    const common = tn.filter((t) => tk.includes(t)).length;
    const score = (2 * common) / (tn.length + tk.length);
    if (score >= 0.66 && (!best || score > best.score)) best = { e, score };
  }
  return best ? { id: best.e.id, fuzzy: true } : undefined;
}

/* ------------------------------------------------------------------ */
/* Cargas, tipos y descansos                                           */
/* ------------------------------------------------------------------ */

const num = (s: string) => Number(s.replace(',', '.'));
const roundHalf = (x: number) => Math.round(x * 2) / 2;

/** "80%", "@8", "RPE 8", "RIR 2", "100 kg" → objetivo de carga. */
export function parseLoad(text: string): LoadTarget | undefined {
  const t = text.toLowerCase();
  const pct = t.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) return { kind: 'pct1rm', pct: num(pct[1]) };
  const kg = t.match(/(\d+(?:[.,]\d+)?)\s*kg/);
  if (kg) return { kind: 'kg', kg: num(kg[1]) };
  const rir = t.match(/rir\s*(\d+(?:[.,]\d+)?)/);
  if (rir) return clampRpe(10 - num(rir[1]));
  const rpe = t.match(/(?:@|rpe)\s*(\d+(?:[.,]\d+)?)/);
  if (rpe) return clampRpe(num(rpe[1]));
  return undefined;
}

function clampRpe(v: number): LoadTarget | undefined {
  if (!Number.isFinite(v) || v < 5 || v > 10) return undefined;
  return { kind: 'rpe', rpe: Math.max(6, roundHalf(v)) };
}

/** Tipo de serie por palabras clave; por defecto, efectiva. */
export function parseSetType(text: string): SetType {
  const t = normalizeName(text);
  if (/\b(top|tope|pesada|heavy single)\b/.test(t)) return 'top';
  if (/\b(back ?off|bajada|descarga)\b/.test(t)) return 'backoff';
  if (/\b(calentamiento|calent|warm ?up|aproximacion)\b/.test(t)) return 'warmup';
  if (/\b(fallo|amrap|failure)\b/.test(t)) return 'failure';
  return 'working';
}

/** "3 min", "3'", "90 s", "90seg", "2:30" → segundos. */
export function parseRest(text: string): number | undefined {
  const t = text.toLowerCase();
  const clock = t.match(/(\d+):(\d{2})/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const min = t.match(/(\d+(?:[.,]\d+)?)\s*(?:'|’|min|m\b)/);
  if (min) return Math.round(num(min[1]) * 60);
  const sec = t.match(/(\d+)\s*(?:s\b|seg|sec|"|”)/);
  if (sec) return Number(sec[1]);
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Texto libre                                                         */
/* ------------------------------------------------------------------ */

// "5x3", "5 x 3", "5×3", "3x8-10", "3 series de 5", "3 sets of 5"
const SCHEME = /(\d+)\s*(?:[x×*]|series\s+de|series\s*x|sets?\s+of|sets?\s*x)\s*(\d+)(?:\s*[-–]\s*\d+)?/gi;
const DAY_RE =
  /^(d[ií]a|day|sesi[oó]n|session|entreno|entrenamiento|workout|semana|week|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday|upper|lower|torso|pierna|piernas|push|pull|full ?body)\b/i;
const REST_RE = /(?:desc(?:anso)?|rest)\.?\s*:?\s*([^,;]+)/i;

function cleanLine(line: string): string {
  return line
    .replace(/^\s*(?:[-*•·▪►]|\d+[.)])\s+/, '')
    .replace(/^#+\s*/, '')
    .trim();
}

function expandSets(count: number, reps: number, target: LoadTarget | undefined, type: SetType): PlannedSet[] {
  const n = Math.min(Math.max(count, 1), 20);
  return Array.from({ length: n }, () => ({ type, reps: Math.max(reps, 1), ...(target ? { target } : {}) }));
}

/** Analiza una línea “Ejercicio 5x3 @80%, 2x5 @75% descanso 3 min”. undefined si no hay esquema de series. */
export function parseExerciseLine(full: string): Omit<DraftExercise, 'exerciseId' | 'fuzzy'> | undefined {
  // "… // nota": lo que va tras // es una nota (así se exportan).
  const [line, ...noteParts] = full.split(/\s+\/\/\s*/);
  const notes = noteParts.join(' // ').trim() || undefined;
  const matches = [...line.matchAll(SCHEME)];
  if (!matches.length) return undefined;

  let name = line.slice(0, matches[0].index).trim();
  // Carga escrita antes del esquema: "Arrancada 80% 3x2".
  let leadingLoad: LoadTarget | undefined;
  const lead = name.match(/(?:@\s*)?\d+(?:[.,]\d+)?\s*%\s*[x×]?\s*$/);
  if (lead) {
    leadingLoad = parseLoad(lead[0]);
    name = name.slice(0, lead.index).trim();
  }
  name = name.replace(/[\s:;,\-–—]+$/, '').trim();

  const restMatch = line.match(REST_RE);
  const restSec = restMatch ? parseRest(restMatch[1]) : undefined;

  const sets: PlannedSet[] = [];
  matches.forEach((m, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : line.length;
    let segment = line.slice(m.index + m[0].length, end);
    if (restMatch) segment = segment.replace(restMatch[0], '');
    const target = parseLoad(segment) ?? (i === 0 ? leadingLoad : undefined);
    sets.push(...expandSets(Number(m[1]), Number(m[2]), target, parseSetType(segment)));
  });
  return { rawName: name, sets, restSec, notes };
}

/** Convierte texto pegado (WhatsApp, PDF, web, celdas de Excel…) en un borrador de rutina. */
export function parseRoutineText(text: string, exercises: Exercise[], fallbackName = 'Rutina importada'): RoutineDraft {
  const lines = text.split(/\r?\n/);
  if (looksTabular(lines)) return parseTable(splitDelimited(text), exercises, fallbackName);

  const draft: RoutineDraft = { name: '', days: [], warnings: [] };
  let current: DraftDay | undefined;
  const day = () => {
    if (!current) {
      current = { name: `Día ${draft.days.length + 1}`, exercises: [] };
      draft.days.push(current);
    }
    return current;
  };

  for (const original of lines) {
    const line = cleanLine(original);
    // Vacía o la leyenda que añade la exportación ("@8 = RPE 8 · 75% = % del 1RM").
    if (!line || /^@s*d+(?:[.,]d+)?s*=/.test(line)) continue;
    const parsed = parseExerciseLine(line);
    if (parsed && parsed.rawName) {
      day().exercises.push(resolve(parsed, exercises));
      continue;
    }
    const header = line.replace(/[:：]\s*$/, '').trim();
    const isHeader = DAY_RE.test(line) || /[:：]\s*$/.test(line);
    const nothingYet = !draft.name && draft.days.length === 0;
    if (!isHeader) {
      // Ejercicio escrito sin series ("Sentadilla"): se reconoce y se le ponen 3×5.
      const m = matchExercise(line, exercises);
      if (m && !m.fuzzy && !nothingYet) {
        day().exercises.push({ rawName: line, exerciseId: m.id, sets: expandSets(3, 5, undefined, 'working') });
        draft.warnings.push(`“${line}” no indicaba series: se pusieron 3×5.`);
        continue;
      }
      if (nothingYet) {
        draft.name = header;
        continue;
      }
    }
    current = { name: header.slice(0, 40), exercises: [] };
    draft.days.push(current);
  }
  return finish(draft, fallbackName);
}

function resolve(ex: Omit<DraftExercise, 'exerciseId' | 'fuzzy'>, exercises: Exercise[]): DraftExercise {
  const m = matchExercise(ex.rawName, exercises);
  return { ...ex, exerciseId: m?.id, fuzzy: m?.fuzzy };
}

function finish(draft: RoutineDraft, fallbackName: string): RoutineDraft {
  const empty = draft.days.filter((d) => d.exercises.length === 0);
  draft.days = draft.days.filter((d) => d.exercises.length > 0);
  if (empty.length && draft.days.length) {
    draft.warnings.push(
      `Se omitieron ${empty.length === 1 ? 'una línea sin ejercicios' : `${empty.length} líneas sin ejercicios`}: ${empty
        .map((d) => `“${d.name}”`)
        .join(', ')}.`,
    );
  }
  draft.name = (draft.name || fallbackName).slice(0, 60);
  return draft;
}

/* ------------------------------------------------------------------ */
/* Tablas: CSV, celdas pegadas desde Excel/Sheets, archivos .xlsx      */
/* ------------------------------------------------------------------ */

const HEADER_EXERCISE = /^(ejercicio|ejercicios|exercise|movimiento|movement|lift)$/;

function looksTabular(lines: string[]): boolean {
  const first = lines.find((l) => l.trim());
  if (!first) return false;
  const delim = detectDelimiter(first);
  return !!delim && first.split(delim).some((c) => HEADER_EXERCISE.test(normalizeName(c)));
}

function detectDelimiter(line: string): string | undefined {
  const counts = ['\t', ';', ','].map((d) => [d, line.split(d).length - 1] as const);
  const best = counts.sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : undefined;
}

/** CSV/TSV con comillas → filas de celdas. */
export function splitDelimited(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const d = detectDelimiter(firstLine) ?? ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === d) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export type Cell = string | number | boolean | Date | null | undefined;

/**
 * Tabla con encabezado. Columnas reconocidas (en cualquier orden):
 * Día · Ejercicio · Series · Reps · Carga (o columnas %, RPE, Kg) · Descanso · Tipo · Notas.
 * Las celdas de Día o Ejercicio vacías heredan el valor de la fila anterior (celdas combinadas).
 */
export function parseTable(rows: Cell[][], exercises: Exercise[], fallbackName = 'Rutina importada'): RoutineDraft {
  const draft: RoutineDraft = { name: fallbackName, days: [], warnings: [] };
  const str = (c: Cell) => (c == null || c instanceof Date ? '' : String(c).trim());
  const headerIdx = rows.findIndex((r) => r.some((c) => HEADER_EXERCISE.test(normalizeName(str(c)))));
  if (headerIdx < 0) {
    draft.warnings.push('No se encontró la fila de encabezado: debe haber una columna llamada “Ejercicio”.');
    return draft;
  }
  const rawHeader = rows[headerIdx].map(str);
  const header = rawHeader.map(normalizeName);
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const cDay = col(/^(dia|day|sesion|session|semana|week|entreno)\b/);
  const cEx = col(HEADER_EXERCISE);
  const cSets = col(/^(series|sets|serie|set)$/);
  const cReps = col(/^(reps|repeticiones|rep|repeticion)$/);
  const cPctNamed = col(/^(porcentaje|pct|1rm)$/);
  const cPct = cPctNamed >= 0 ? cPctNamed : rawHeader.findIndex((h) => h.includes('%'));
  const cRpe = col(/^(rpe|rir)$/);
  const cKg = col(/^(kg|peso|weight)$/);
  const cLoad = col(/^(carga|objetivo|load|target|intensidad)$/);
  const cRest = col(/^(descanso|rest|pausa)$/);
  const cType = col(/^(tipo|type)$/);
  const cNotes = col(/^(notas|nota|notes|comentarios)$/);
  const rpeIsRir = cRpe >= 0 && header[cRpe] === 'rir';

  let dayName = '';
  let lastEx: DraftExercise | undefined;
  let lastDay: DraftDay | undefined;

  for (const r of rows.slice(headerIdx + 1)) {
    const exName = str(r[cEx]);
    const rawDay = cDay >= 0 ? str(r[cDay]) : '';
    if (rawDay) dayName = /^\d+$/.test(rawDay) ? `Día ${rawDay}` : rawDay;
    if (!dayName) dayName = 'Día 1';
    if (!exName && !lastEx) continue;

    let day = draft.days.find((d) => d.name === dayName.slice(0, 40));
    if (!day) {
      day = { name: dayName.slice(0, 40), exercises: [] };
      draft.days.push(day);
    }

    const setsN = cSets >= 0 ? Math.round(num(str(r[cSets]) || '1')) || 1 : 1;
    const reps = Number(str(r[cReps]).match(/\d+/)?.[0] ?? 0);
    if (!reps) continue;

    const loadText = cLoad >= 0 ? str(r[cLoad]) : '';
    let target = parseLoad(loadText);
    if (!target && cPct >= 0 && str(r[cPct])) {
      const v = num(str(r[cPct]).replace('%', ''));
      // Excel guarda 80 % como 0,8.
      if (Number.isFinite(v) && v > 0) target = { kind: 'pct1rm', pct: v <= 1.5 ? Math.round(v * 1000) / 10 : v };
    }
    if (!target && cRpe >= 0 && str(r[cRpe])) {
      const v = num(str(r[cRpe]));
      target = clampRpe(rpeIsRir ? 10 - v : v);
    }
    if (!target && cKg >= 0 && str(r[cKg])) {
      const v = num(str(r[cKg]).replace(/kg/i, '').trim());
      if (Number.isFinite(v) && v > 0) target = { kind: 'kg', kg: v };
    }
    // Número suelto en “Carga”: ≤ 1,5 → fracción de 1RM; ≤ 10 → RPE; si no, kg.
    if (!target && /^\d+(?:[.,]\d+)?$/.test(loadText)) {
      const v = num(loadText);
      target = v <= 1.5 ? { kind: 'pct1rm', pct: Math.round(v * 1000) / 10 } : v <= 10 ? clampRpe(v) : { kind: 'kg', kg: v };
    }

    const type = parseSetType(cType >= 0 ? str(r[cType]) : loadText);
    const sets = expandSets(setsN, reps, target, type);
    const restText = cRest >= 0 ? str(r[cRest]) : '';
    let restSec = restText ? parseRest(restText) : undefined;
    if (restSec == null && /^\d+(?:[.,]\d+)?$/.test(restText)) {
      const v = num(restText);
      restSec = v <= 10 ? Math.round(v * 60) : Math.round(v); // “3” = 3 min; “180” = 180 s
    }
    const notes = cNotes >= 0 ? str(r[cNotes]) || undefined : undefined;

    const sameAsLast = lastEx && lastDay === day && (!exName || normalizeName(exName) === normalizeName(lastEx.rawName));
    if (sameAsLast && lastEx) {
      lastEx.sets.push(...sets);
      lastEx.restSec ??= restSec;
      continue;
    }
    lastEx = resolve({ rawName: exName, sets, restSec, notes }, exercises);
    lastDay = day;
    day.exercises.push(lastEx);
  }
  if (draft.days.length === 0) draft.warnings.push('La tabla no tiene filas con ejercicio y repeticiones.');
  return finish(draft, fallbackName);
}

/* ------------------------------------------------------------------ */
/* Archivos de Fuerza (compartir rutinas entre teléfonos)              */
/* ------------------------------------------------------------------ */

export interface RoutineFile {
  app: 'fuerza';
  kind: 'routine';
  version: 1;
  routine: {
    name: string;
    days: {
      name: string;
      exercises: { exercise: ExerciseDefinition; restSec?: number; notes?: string; sets: PlannedSet[] }[];
    }[];
  };
}

/** Los ids cambian entre dispositivos: se exporta cada ejercicio por nombre y con su definición. */
export function toRoutineFile(routine: Routine, exercises: Map<number, Exercise>): RoutineFile {
  return {
    app: 'fuerza',
    kind: 'routine',
    version: 1,
    routine: {
      name: routine.name,
      days: routine.days.map((d) => ({
        name: d.name,
        exercises: d.exercises.flatMap((pe) => {
          const e = exercises.get(pe.exerciseId);
          if (!e) return [];
          const { name, category, equipment, barWeight, muscles } = e;
          const nameEn = englishName(name);
          return [{ exercise: { name, ...(nameEn !== name && { nameEn }), category, equipment, barWeight, muscles }, restSec: pe.restSec, notes: pe.notes, sets: pe.sets }];
        }),
      })),
    },
  };
}

export function isRoutineFile(data: unknown): data is RoutineFile {
  const d = data as RoutineFile;
  return !!d && d.app === 'fuerza' && d.kind === 'routine' && Array.isArray(d.routine?.days);
}

export function draftFromRoutineFile(file: RoutineFile, exercises: Exercise[]): RoutineDraft {
  return finish(
    {
      name: file.routine.name,
      warnings: [],
      days: file.routine.days.map((d) => ({
        name: d.name,
        exercises: d.exercises.map((x) => {
          // Mismo nombre (o alias) → mismo ejercicio. Si no existe, se crea con su definición.
          const m = matchExercise(x.exercise.name, exercises) ?? (x.exercise.nameEn ? matchExercise(x.exercise.nameEn, exercises) : undefined);
          return {
            rawName: x.exercise.name,
            exerciseId: m && !m.fuzzy ? m.id : undefined,
            definition: x.exercise,
            sets: x.sets.map((s) => ({ ...s })),
            restSec: x.restSec,
            notes: x.notes,
          };
        }),
      })),
    },
    file.routine.name,
  );
}

/* ------------------------------------------------------------------ */
/* Ejercicios que no existen                                           */
/* ------------------------------------------------------------------ */

/** Definición razonable para crear un ejercicio desconocido a partir de su nombre. */
export function guessDefinition(rawName: string): ExerciseDefinition {
  const n = normalizeName(rawName);
  const has = (re: RegExp) => re.test(n);
  const rules: [RegExp, ExerciseCategory][] = [
    [/arrancada|cargada|envion|snatch|clean|jerk|tiron/, 'olympic'],
    [/salto|jump|pliometr|lanzamiento|slam|bound/, 'plyo'],
    [/sentadilla|squat/, 'squat'],
    [/banca|bench/, 'bench'],
    [/muerto|deadlift/, 'deadlift'],
    [/militar|hombro|overhead|press/, 'ohp'],
    [/remo|row|dominada|jalon|pull/, 'back'],
    [/abdominal|plancha|core|crunch/, 'core'],
    [/curl|triceps|biceps|lateral/, 'upper'],
  ];
  const category = rules.find(([re]) => has(re))?.[1] ?? 'legs';
  const equipmentRules: [RegExp, Equipment][] = [
    [/mancuerna|dumbbell|\bdb\b/, 'dumbbell'],
    [/polea|cable/, 'cable'],
    [/maquina|machine|prensa/, 'machine'],
    [/kettlebell|\bkb\b|pesa rusa/, 'kettlebell'],
    [/balon|med ball|medicine/, 'medball'],
    [/salto|jump|plancha|flexion|dominada|fondos|peso corporal/, 'bodyweight'],
  ];
  const equipment = equipmentRules.find(([re]) => has(re))?.[1] ?? 'barbell';
  const name = rawName
    .trim()
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase())
    .slice(0, 60);
  return { name, category, equipment, ...(equipment === 'barbell' ? { barWeight: 20 } : {}) };
}

/* ------------------------------------------------------------------ */
/* Resumen legible: 1×2 @75% · 4×2 @80%                                */
/* ------------------------------------------------------------------ */

export function groupSets(sets: PlannedSet[]): { count: number; set: PlannedSet }[] {
  const out: { count: number; set: PlannedSet }[] = [];
  for (const s of sets) {
    const last = out[out.length - 1];
    if (last && last.set.type === s.type && last.set.reps === s.reps && JSON.stringify(last.set.target) === JSON.stringify(s.target))
      last.count++;
    else out.push({ count: 1, set: s });
  }
  return out;
}
