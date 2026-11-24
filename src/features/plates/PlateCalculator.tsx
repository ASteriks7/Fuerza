import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useSettings } from '../../db/settings';
import { calcPlates, groupPlates } from '../../domain/plates';
import { fmtNum, parseNum } from '../../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  initialWeight?: number;
  barWeight?: number;
}

const BARS = [20, 15, 10];

/** Colores IPF y tamaño relativo (alto/ancho en px) de cada disco. */
const PLATE_STYLE: Record<string, { bg: string; fg: string; h: number; w: number }> = {
  '25': { bg: '#d92d2d', fg: '#fff', h: 120, w: 20 },
  '20': { bg: '#2563eb', fg: '#fff', h: 120, w: 18 },
  '15': { bg: '#eab308', fg: '#111', h: 108, w: 16 },
  '10': { bg: '#16a34a', fg: '#fff', h: 94, w: 14 },
  '5': { bg: '#f5f5f5', fg: '#111', h: 72, w: 12 },
  '2.5': { bg: '#262626', fg: '#fff', h: 58, w: 10 },
  '1.25': { bg: '#c0c0c8', fg: '#111', h: 48, w: 9 },
};
const styleFor = (p: number) => PLATE_STYLE[String(p)] ?? { bg: '#888', fg: '#111', h: 60, w: 10 };

export function PlateCalculator({ open, onClose, initialWeight, barWeight = 20 }: Props) {
  const { availablePlates } = useSettings();
  const [text, setText] = useState('');
  const [bar, setBar] = useState(barWeight);

  useEffect(() => {
    if (!open) return;
    setText(initialWeight ? fmtNum(initialWeight) : '');
    setBar(barWeight);
  }, [open, initialWeight, barWeight]);

  const target = parseNum(text) ?? 0;
  const result = calcPlates(target, bar, availablePlates);
  const groups = groupPlates(result.perSide);
  const bump = (d: number) => setText(fmtNum(Math.max(0, target + d)));

  return (
    <BottomSheet open={open} onClose={onClose} title="Calculadora de discos">
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => bump(-2.5)} className="btn btn-ghost size-14 px-0" aria-label="Menos 2,5 kg">
            <Minus size={22} />
          </button>
          <label className="relative flex-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={(e) => e.target.select()}
              inputMode="decimal"
              placeholder="0"
              aria-label="Peso total en kg"
              className="field h-14 pr-10 text-center text-3xl font-bold tabular-nums"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">kg</span>
          </label>
          <button onClick={() => bump(2.5)} className="btn btn-ghost size-14 px-0" aria-label="Más 2,5 kg">
            <Plus size={22} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Barra</span>
          {BARS.map((b) => (
            <button key={b} className="chip" data-active={bar === b} onClick={() => setBar(b)}>
              {b} kg
            </button>
          ))}
        </div>

        {/* Visual: una manga de la barra, discos de dentro hacia fuera */}
        <div className="card flex h-40 items-center overflow-x-auto bg-surface-2 px-3">
          <div className="h-3 w-10 shrink-0 rounded-l bg-zinc-400" />
          <div className="h-8 w-3 shrink-0 rounded-sm bg-zinc-300" />
          {result.perSide.map((p, i) => {
            const s = styleFor(p);
            return (
              <div
                key={i}
                className="mx-px flex shrink-0 items-center justify-center rounded-[3px] text-[10px] font-bold [writing-mode:vertical-rl]"
                style={{ height: s.h, width: s.w, background: s.bg, color: s.fg, border: '1px solid #0006' }}
              >
                {s.w >= 12 ? fmtNum(p) : ''}
              </div>
            );
          })}
          <div className="h-4 min-w-8 flex-1 rounded-r bg-zinc-400" />
        </div>

        <div className="text-center">
          {groups.length === 0 ? (
            <p className="text-lg font-semibold">Solo la barra</p>
          ) : (
            <p className="text-lg font-semibold">
              Por lado:{' '}
              {groups.map((g, i) => (
                <span key={g.plate}>
                  {i > 0 && ' + '}
                  {g.count > 1 && `${g.count}×`}
                  {fmtNum(g.plate)}
                </span>
              ))}
            </p>
          )}
          {!result.exact && target > 0 && (
            <p className="mt-1 text-sm text-warmup">
              No es exacto con tus discos: se cargan {fmtNum(result.achieved)} kg
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
