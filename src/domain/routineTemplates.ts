// Plantillas de rutina incluidas en la app. Se escriben en el mismo formato de
// texto que el usuario puede pegar (y pasan por el mismo intérprete).
// Los % se calculan sobre el 1RM de cada ejercicio (manual o e1RM reciente).

export interface RoutineTemplate {
  id: string;
  name: string;
  tag: 'Fuerza' | 'Powerlifting' | 'Halterofilia' | 'Potencia';
  description: string;
  text: string;
  /** Semana de descarga cada N semanas al importarla (se puede cambiar en la rutina). */
  deloadEvery: number;
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'fuerza-3',
    name: 'Fuerza básica · 3 días',
    tag: 'Fuerza',
    deloadEvery: 4,
    description: 'Cuerpo completo con sentadilla, banca y peso muerto por %. Ideal para empezar.',
    text: `Fuerza básica · 3 días
Día A
Sentadilla: 4x5 @75% descanso 3 min
Press banca: 4x5 @75% descanso 3 min
Remo con barra: 3x8 @8
Rueda abdominal: 3x10
Día B
Peso muerto: 3x5 @75% descanso 3 min
Press militar: 4x6 @70%
Dominadas: 3x8 @8
Sentadilla búlgara: 3x10 @8
Día C
Sentadilla: 5x3 @80% descanso 3 min
Press banca: 5x3 @80% descanso 3 min
Peso muerto rumano: 3x8 @7
Face pull: 3x15`,
  },
  {
    id: 'pl-4-rpe',
    name: 'Powerlifting · 4 días (RPE)',
    tag: 'Powerlifting',
    deloadEvery: 4,
    description: 'Top set + back-offs por RPE en los básicos y variantes para puntos débiles.',
    text: `Powerlifting · 4 días (RPE)
Día 1 · Sentadilla y banca
Sentadilla: 1x3 @8 top, 3x5 @7 backoff descanso 4 min
Press banca: 1x3 @8 top, 3x5 @7 backoff descanso 3 min
Remo con barra: 4x8 @8
Día 2 · Peso muerto y press
Peso muerto: 1x3 @8 top, 2x4 @7 backoff descanso 4 min
Press militar: 3x6 @8
Jalón al pecho: 3x10 @8
Hip thrust: 3x8 @8
Día 3 · Variantes
Sentadilla con pausa: 4x4 @7
Press banca agarre cerrado: 4x6 @8
Remo con mancuerna: 3x10 @8
Curl femoral: 3x12 @8
Día 4 · Volumen de banca
Press banca con pausa larga: 5x4 @7
Peso muerto con déficit: 3x5 @7
Fondos en paralelas: 3x10 @8
Rueda abdominal: 3x10`,
  },
  {
    id: 'oly-inicio-3',
    name: 'Halterofilia · iniciación 3 días',
    tag: 'Halterofilia',
    deloadEvery: 4,
    description: 'Técnica con variantes de potencia y colgantes, tirones y sentadilla frontal.',
    text: `Halterofilia · iniciación 3 días
Día 1
Arrancada de potencia: 5x3 @65% descanso 2 min
Cargada de potencia: 5x3 @65% descanso 2 min
Sentadilla frontal: 4x5 @70%
Press militar: 3x6 @7
Día 2
Arrancada colgante: 5x2 @65% descanso 2 min
Envión desde rack: 5x2 @70% descanso 2 min
Tirón de cargada: 4x4 @85%
Sentadilla de arrancada (overhead squat): 3x5 @7
Día 3
Arrancada: 6x2 @70% descanso 2 min
Cargada: 5x2 @70% descanso 2 min
Sentadilla: 4x5 @75%
Salto al cajón: 3x5`,
  },
  {
    id: 'oly-inter-4',
    name: 'Halterofilia · intermedio 4 días',
    tag: 'Halterofilia',
    deloadEvery: 4,
    description: 'Arrancada y dos tiempos con series pesadas, tirones al 90–100 % y sentadillas.',
    text: `Halterofilia · intermedio 4 días
Día 1 · Arrancada
Arrancada: 1x2 @75%, 4x2 @80% descanso 2 min
Tirón de arrancada: 4x3 @90%
Sentadilla: 5x3 @80% descanso 3 min
Día 2 · Dos tiempos
Cargada colgante: 4x2 @75% descanso 2 min
Envión en tijera: 5x2 @80% descanso 2 min
Sentadilla frontal: 4x3 @80%
Remo Pendlay: 3x6 @8
Día 3 · Potencia
Arrancada de potencia: 5x2 @75%
Cargada de potencia: 5x2 @75%
Push press: 4x4 @7
Peso muerto rumano: 3x6 @7
Día 4 · Pesado
Arrancada: 1x1 @85% top, 3x1 @80% descanso 2 min
Dos tiempos (cargada y envión): 1x1 @85% top, 3x1 @80% descanso 2 min
Sentadilla frontal: 3x2 @85%
Tirón de cargada: 3x3 @100%`,
  },
  {
    id: 'potencia-2',
    name: 'Potencia y pliometría · 2 días',
    tag: 'Potencia',
    deloadEvery: 4,
    description: 'Saltos, lanzamientos y levantamientos explosivos para mejorar la potencia.',
    text: `Potencia y pliometría · 2 días
Día 1
Salto al cajón: 4x3 descanso 90 s
Lanzamiento de balón medicinal al pecho: 3x5
Cargada colgante de potencia: 5x3 @70% descanso 2 min
Sentadilla con salto: 3x5
Sentadilla: 4x4 @80% descanso 3 min
Día 2
Salto de longitud: 4x3 descanso 90 s
Saltos de vallas: 3x6
Slam con balón medicinal: 3x8
Salto con barra hexagonal: 4x3 @7
Peso muerto con barra hexagonal: 3x5 @75% descanso 3 min`,
  },
];

/** Ejemplo para importar desde Excel (separado por “;” para que Excel en español lo abra bien). */
export const CSV_EXAMPLE = `Día;Ejercicio;Series;Reps;Carga;Descanso;Tipo
Día 1;Sentadilla;1;3;@8;4 min;Top
Día 1;Sentadilla;3;5;75%;3 min;Back-off
Día 1;Press banca;4;6;70%;3 min;
Día 1;Arrancada de potencia;5;2;70%;2 min;
Día 2;Peso muerto;3;5;100 kg;3 min;
Día 2;Envión en tijera;5;2;80%;2 min;
Día 2;Salto al cajón;3;5;;90 s;
`;
