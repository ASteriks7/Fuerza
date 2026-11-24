export interface PlateResult {
  /** Discos por lado, de mayor a menor. */
  perSide: number[];
  /** Peso total que se consigue con esos discos (barra incluida). */
  achieved: number;
  exact: boolean;
}

// Se trabaja en centésimas de kg (enteros) para evitar errores de coma flotante
// con 2.5 y 1.25.
const toCg = (kg: number) => Math.round(kg * 100);

/**
 * Discos por lado para llegar a `target` con una barra de `bar` kg.
 * Algoritmo voraz (de mayor a menor), con pares ilimitados de cada disco disponible.
 * Si no es exacto, devuelve la carga más cercana por debajo.
 */
export function calcPlates(target: number, bar: number, available: number[]): PlateResult {
  const plates = [...new Set(available)].filter((p) => p > 0).sort((a, b) => b - a);
  let sideCg = Math.max(0, Math.floor((toCg(target) - toCg(bar)) / 2));
  const perSide: number[] = [];
  for (const p of plates) {
    const pCg = toCg(p);
    while (sideCg >= pCg) {
      perSide.push(p);
      sideCg -= pCg;
    }
  }
  const loadedCg = perSide.reduce((t, p) => t + toCg(p), 0);
  const achievedCg = Math.max(toCg(bar), toCg(bar) + loadedCg * 2);
  return { perSide, achieved: achievedCg / 100, exact: achievedCg === toCg(target) };
}

/** [25, 25, 10] → [{ plate: 25, count: 2 }, { plate: 10, count: 1 }] */
export function groupPlates(perSide: number[]): { plate: number; count: number }[] {
  const out: { plate: number; count: number }[] = [];
  for (const p of perSide) {
    const last = out.at(-1);
    if (last && last.plate === p) last.count++;
    else out.push({ plate: p, count: 1 });
  }
  return out;
}
