import type { EntityTable, Table } from 'dexie';
import type { Equipment, Exercise, ExerciseCategory, Muscle, MuscleMap } from './types';

type Seed = Omit<Exercise, 'id' | 'isCustom' | 'archived'>;

/** m('quads glutes', 'adductors') → { primary: [...], secondary: [...] } */
function m(primary: string, secondary = ''): MuscleMap {
  const split = (s: string) => s.split(/\s+/).filter(Boolean) as Muscle[];
  return { primary: split(primary), secondary: split(secondary) };
}

const bb = (name: string, category: ExerciseCategory, muscles: MuscleMap, extra: Partial<Seed> = {}): Seed => ({
  name,
  category,
  equipment: 'barbell',
  barWeight: 20,
  muscles,
  ...extra,
});

const other = (name: string, category: ExerciseCategory, equipment: Equipment, muscles: MuscleMap): Seed => ({
  name,
  category,
  equipment,
  muscles,
});

// Patrones de músculos reutilizados.
const SQ = m('quads glutes', 'adductors lowerBack abs');
const FRONT_SQ = m('quads', 'glutes upperBack abs');
const BENCH = m('chest triceps', 'frontDelts');
const CG_BENCH = m('triceps chest', 'frontDelts');
const INCLINE = m('chest frontDelts', 'triceps');
const DL = m('glutes hamstrings lowerBack', 'quads traps upperBack forearms');
const SUMO = m('glutes quads adductors', 'hamstrings lowerBack traps forearms');
const RDL = m('hamstrings glutes', 'lowerBack forearms');
const OHP = m('frontDelts triceps', 'sideDelts upperBack abs');
const ROW = m('lats upperBack', 'rearDelts biceps lowerBack');
const VERT_PULL = m('lats', 'biceps upperBack forearms');

// Halterofilia
const SNATCH = m('quads glutes hamstrings traps', 'lowerBack upperBack frontDelts triceps abs');
const POWER_SNATCH = m('glutes hamstrings traps', 'quads lowerBack upperBack frontDelts triceps');
const CLEAN = m('quads glutes hamstrings traps', 'lowerBack upperBack abs');
const POWER_CLEAN = m('glutes hamstrings traps', 'quads lowerBack upperBack');
const PULL = m('glutes hamstrings traps', 'quads lowerBack upperBack forearms');
const JERK = m('frontDelts triceps quads', 'glutes sideDelts upperBack abs');
const OH_SQ = m('quads glutes frontDelts', 'upperBack triceps abs');

// Pliometría
const JUMP = m('quads glutes', 'calves hamstrings');
const HORIZ_JUMP = m('glutes quads hamstrings', 'calves');
const REACTIVE = m('quads calves glutes', 'hamstrings');

const SEED: Seed[] = [
  // Sentadilla
  bb('Sentadilla', 'squat', SQ, { sbdSlot: 'S' }),
  bb('Sentadilla low bar', 'squat', m('glutes quads', 'adductors hamstrings lowerBack')),
  bb('Sentadilla con pausa', 'squat', SQ),
  bb('Sentadilla frontal', 'squat', FRONT_SQ),
  bb('Sentadilla tempo', 'squat', SQ),
  bb('Sentadilla con safety bar', 'squat', m('quads glutes', 'upperBack adductors lowerBack'), { barWeight: 25 }),
  bb('Sentadilla a cajón', 'squat', m('glutes quads', 'hamstrings adductors lowerBack')),
  bb('Pin squat', 'squat', SQ),
  bb('Sentadilla 1¼', 'squat', SQ),
  bb('Sentadilla con bandas o cadenas', 'squat', SQ),
  bb('Sentadilla Zercher', 'squat', m('quads glutes', 'upperBack abs biceps adductors')),
  bb('Sentadilla con talones elevados', 'squat', m('quads', 'glutes adductors')),
  other('Sentadilla goblet', 'squat', 'dumbbell', m('quads glutes', 'abs adductors')),
  other('Sentadilla hack', 'squat', 'machine', m('quads', 'glutes')),
  other('Sentadilla en Smith', 'squat', 'machine', m('quads glutes', 'adductors')),
  other('Belt squat', 'squat', 'machine', m('quads glutes', 'adductors')),
  other('Sentadilla pistol', 'squat', 'bodyweight', m('quads glutes', 'abs adductors calves')),

  // Press banca
  bb('Press banca', 'bench', BENCH, { sbdSlot: 'B' }),
  bb('Press banca con pausa larga', 'bench', BENCH),
  bb('Press banca agarre cerrado', 'bench', CG_BENCH),
  bb('Press banca agarre ancho', 'bench', m('chest', 'frontDelts triceps')),
  bb('Press banca Larsen', 'bench', BENCH),
  bb('Press banca Spoto', 'bench', BENCH),
  bb('Press banca con tablas', 'bench', CG_BENCH),
  bb('Press banca desde pines', 'bench', CG_BENCH),
  bb('Press banca con bandas o cadenas', 'bench', BENCH),
  bb('Press de suelo', 'bench', CG_BENCH),
  bb('Press banca declinado', 'bench', m('chest triceps', 'frontDelts')),
  bb('Press inclinado con barra', 'bench', INCLINE),
  other('Press banca con mancuernas', 'bench', 'dumbbell', BENCH),
  other('Press inclinado con mancuernas', 'bench', 'dumbbell', INCLINE),
  other('Fondos en paralelas', 'bench', 'bodyweight', m('chest triceps', 'frontDelts')),

  // Peso muerto
  bb('Peso muerto', 'deadlift', DL, { sbdSlot: 'D' }),
  bb('Peso muerto sumo', 'deadlift', SUMO),
  bb('Peso muerto con déficit', 'deadlift', DL),
  bb('Peso muerto con pausa', 'deadlift', DL),
  bb('Peso muerto rumano', 'deadlift', RDL),
  bb('Peso muerto piernas rígidas', 'deadlift', RDL),
  bb('Peso muerto agarre de arrancada', 'deadlift', m('glutes hamstrings lowerBack upperBack traps', 'quads forearms')),
  bb('Peso muerto desde bloques', 'deadlift', m('glutes lowerBack hamstrings', 'traps upperBack forearms')),
  bb('Peso muerto con bandas o cadenas', 'deadlift', DL),
  bb('Peso muerto Jefferson', 'deadlift', m('glutes adductors quads', 'hamstrings lowerBack obliques')),
  bb('Rack pull', 'deadlift', m('lowerBack glutes traps', 'hamstrings upperBack forearms')),
  bb('Peso muerto con barra hexagonal', 'deadlift', m('quads glutes hamstrings', 'lowerBack traps forearms'), { barWeight: 25 }),
  bb('Buenos días', 'deadlift', m('hamstrings lowerBack', 'glutes')),
  other('Peso muerto rumano con mancuernas', 'deadlift', 'dumbbell', RDL),
  other('Peso muerto a una pierna', 'deadlift', 'dumbbell', m('hamstrings glutes', 'lowerBack adductors forearms')),

  // Halterofilia
  bb('Arrancada', 'olympic', SNATCH),
  bb('Arrancada de potencia', 'olympic', POWER_SNATCH),
  bb('Arrancada colgante', 'olympic', SNATCH),
  bb('Arrancada colgante de potencia', 'olympic', POWER_SNATCH),
  bb('Arrancada desde bloques', 'olympic', SNATCH),
  bb('Muscle snatch', 'olympic', m('traps frontDelts sideDelts', 'upperBack triceps glutes hamstrings')),
  bb('Snatch balance', 'olympic', OH_SQ),
  bb('Sentadilla de arrancada (overhead squat)', 'olympic', OH_SQ),
  bb('Tirón de arrancada', 'olympic', PULL),
  bb('Cargada', 'olympic', CLEAN),
  bb('Cargada de potencia', 'olympic', POWER_CLEAN),
  bb('Cargada colgante', 'olympic', CLEAN),
  bb('Cargada colgante de potencia', 'olympic', POWER_CLEAN),
  bb('Cargada desde bloques', 'olympic', CLEAN),
  bb('Tirón de cargada', 'olympic', PULL),
  bb('Tirón alto', 'olympic', m('traps glutes hamstrings', 'sideDelts upperBack lowerBack')),
  bb('Dos tiempos (cargada y envión)', 'olympic', m('quads glutes hamstrings traps frontDelts triceps', 'lowerBack upperBack abs')),
  bb('Envión en tijera', 'olympic', JERK),
  bb('Envión de potencia', 'olympic', JERK),
  bb('Envión desde rack', 'olympic', JERK),

  // Pliometría
  other('Salto al cajón', 'plyo', 'bodyweight', JUMP),
  other('Salto vertical', 'plyo', 'bodyweight', JUMP),
  other('Sentadilla con salto', 'plyo', 'bodyweight', JUMP),
  other('Salto con rodillas al pecho', 'plyo', 'bodyweight', m('quads glutes', 'abs calves')),
  other('Salto de longitud', 'plyo', 'bodyweight', HORIZ_JUMP),
  other('Salto en profundidad (drop jump)', 'plyo', 'bodyweight', REACTIVE),
  other('Saltos de vallas', 'plyo', 'bodyweight', m('calves quads', 'glutes')),
  other('Saltos alternos (bounding)', 'plyo', 'bodyweight', m('glutes hamstrings quads', 'calves adductors')),
  other('Saltos laterales de patinador', 'plyo', 'bodyweight', m('glutes quads', 'adductors calves')),
  bb('Salto con barra hexagonal', 'plyo', m('quads glutes', 'hamstrings calves traps'), { barWeight: 25 }),
  other('Flexiones pliométricas', 'plyo', 'bodyweight', m('chest triceps', 'frontDelts abs')),
  other('Lanzamiento de balón medicinal al pecho', 'plyo', 'medball', m('chest triceps frontDelts', 'abs')),
  other('Lanzamiento de balón medicinal hacia atrás', 'plyo', 'medball', m('glutes hamstrings lowerBack', 'quads frontDelts upperBack')),
  other('Slam con balón medicinal', 'plyo', 'medball', m('abs lats', 'frontDelts triceps obliques')),
  other('Swing con kettlebell', 'plyo', 'kettlebell', m('glutes hamstrings', 'lowerBack frontDelts abs forearms')),

  // Press militar
  bb('Press militar', 'ohp', OHP),
  bb('Push press', 'ohp', m('frontDelts triceps', 'quads glutes sideDelts upperBack')),
  other('Press de hombro con mancuernas', 'ohp', 'dumbbell', m('frontDelts triceps', 'sideDelts')),

  // Espalda
  bb('Remo con barra', 'back', ROW),
  bb('Remo Pendlay', 'back', ROW),
  other('Dominadas', 'back', 'bodyweight', VERT_PULL),
  other('Jalón al pecho', 'back', 'cable', VERT_PULL),
  other('Remo con mancuerna', 'back', 'dumbbell', m('lats upperBack', 'rearDelts biceps')),
  other('Remo en polea baja', 'back', 'cable', m('lats upperBack', 'rearDelts biceps')),

  // Piernas
  other('Prensa de piernas', 'legs', 'machine', m('quads glutes', 'adductors')),
  bb('Hip thrust', 'legs', m('glutes', 'hamstrings adductors')),
  other('Sentadilla búlgara', 'legs', 'dumbbell', m('quads glutes', 'adductors hamstrings')),
  other('Zancadas', 'legs', 'dumbbell', m('quads glutes', 'adductors hamstrings calves')),
  other('Curl femoral', 'legs', 'machine', m('hamstrings', 'calves')),
  other('Extensión de cuádriceps', 'legs', 'machine', m('quads')),
  other('Elevación de gemelos', 'legs', 'machine', m('calves')),

  // Tren superior
  bb('Curl con barra', 'upper', m('biceps', 'forearms')),
  other('Extensión de tríceps en polea', 'upper', 'cable', m('triceps')),
  bb('Press francés', 'upper', m('triceps'), { barWeight: 10 }),
  other('Elevaciones laterales', 'upper', 'dumbbell', m('sideDelts', 'traps')),
  other('Face pull', 'upper', 'cable', m('rearDelts upperBack', 'traps')),

  // Core
  other('Plancha', 'core', 'bodyweight', m('abs', 'obliques')),
  other('Rueda abdominal', 'core', 'bodyweight', m('abs', 'lats obliques')),
  other('Elevación de piernas colgado', 'core', 'bodyweight', m('abs', 'obliques forearms')),
];

export const SEED_EXERCISES: Omit<Exercise, 'id'>[] = SEED.map((e) => ({
  ...e,
  isCustom: false,
  archived: 0,
}));

const key = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

/**
 * Pone al día la biblioteca de una base existente (actualización de versión o
 * importación de una copia antigua): añade los ejercicios nuevos del catálogo y
 * rellena los músculos de los que no los tengan. Nunca toca lo que ya editaste.
 */
export async function syncSeedExercises(table: EntityTable<Exercise, 'id'> | Table<Exercise, number>): Promise<void> {
  const existing = await table.toArray();
  const byName = new Map(existing.map((e) => [key(e.name), e]));
  const toAdd: Omit<Exercise, 'id'>[] = [];
  for (const seed of SEED_EXERCISES) {
    const found = byName.get(key(seed.name));
    if (!found) toAdd.push(seed);
    else if (!found.muscles && seed.muscles) await table.update(found.id, { muscles: seed.muscles });
  }
  if (toAdd.length) await table.bulkAdd(toAdd as Exercise[]);
}
