import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ChevronLeft, FileSpreadsheet, FileUp, LibraryBig, Replace, Sparkles, Type } from 'lucide-react';
import { db } from '../../db/schema';
import { saveDraft } from '../../db/routineIO';
import type { Exercise } from '../../db/types';
import {
  draftFromRoutineFile,
  groupSets,
  isRoutineFile,
  parseRoutineText,
  parseTable,
  type Cell,
  type DraftExercise,
  type RoutineDraft,
} from '../../domain/routineImport';
import { CSV_EXAMPLE, ROUTINE_TEMPLATES } from '../../domain/routineTemplates';
import { describeTarget, SET_TYPES } from '../../lib/labels';
import { shareFile } from '../../lib/share';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ExercisePicker } from '../exercises/ExercisePicker';

type Tab = 'templates' | 'text' | 'file';

const TEXT_EXAMPLE = `Mi rutina
Día 1
Sentadilla 1x3 @8 top, 3x5 @7
Press banca 4x6 @75%
Arrancada de potencia 5x2 70%
Día 2
Peso muerto 3x5 100kg descanso 3 min
Power clean 5x3 @70%
Box jump 3x5`;

export function ImportRoutinePage() {
  const navigate = useNavigate();
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const [tab, setTab] = useState<Tab>('templates');
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!exercises) return null;

  const accept = (d: RoutineDraft) => {
    if (d.days.length === 0) {
      setError(d.warnings[0] ?? 'No se encontró ningún ejercicio con series (por ejemplo “Sentadilla 5x5 @75%”).');
      return;
    }
    setError(null);
    setDraft(d);
    window.scrollTo(0, 0);
  };

  const readFile = async (file: File) => {
    setBusy(true);
    setError(null);
    const base = file.name.replace(/\.[^.]+$/, '').replace(/\.fuerza$/, '');
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        accept(parseTable((await readSheet(file)) as Cell[][], exercises, base));
      } else if (/\.(xls|numbers|ods)$/i.test(file.name)) {
        setError('Ese formato no se puede leer. En Excel usa “Guardar como” → Libro de Excel (.xlsx) o CSV.');
      } else {
        const content = await file.text();
        const trimmed = content.trim();
        if (trimmed.startsWith('{')) {
          const data: unknown = JSON.parse(trimmed);
          if (isRoutineFile(data)) accept(draftFromRoutineFile(data, exercises));
          else if ((data as { tables?: unknown }).tables)
            setError('Es una copia de seguridad completa: impórtala desde Ajustes → Copia de seguridad.');
          else setError('El archivo no es una rutina de Fuerza.');
        } else accept(parseRoutineText(content, exercises, base));
      }
    } catch {
      setError('No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const id = await saveDraft(draft);
      navigate(`/routines/${id}`, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  if (draft) {
    return (
      <DraftReview
        draft={draft}
        exercises={exercises}
        busy={busy}
        onChange={setDraft}
        onCancel={() => setDraft(null)}
        onSave={save}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/routines" className="-ml-2 flex h-11 items-center gap-1 text-muted">
        <ChevronLeft size={22} /> Rutinas
      </Link>
      <h1 className="text-3xl font-black">Importar rutina</h1>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ['templates', 'Plantillas', LibraryBig],
            ['text', 'Texto', Type],
            ['file', 'Archivo', FileUp],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              setError(null);
            }}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold ${tab === k ? 'bg-surface text-fg' : 'text-muted'}`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="flex gap-2 rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" /> {error}
        </p>
      )}

      {tab === 'templates' &&
        ROUTINE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => accept(parseRoutineText(t.text, exercises))}
            className="card flex flex-col gap-1 p-4 text-left active:bg-surface-2"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-bold">{t.name}</span>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-accent">{t.tag}</span>
            </span>
            <span className="text-sm text-muted">{t.description}</span>
          </button>
        ))}

      {tab === 'text' && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Pega la rutina desde WhatsApp, un PDF, una web o celdas copiadas de Excel. Una línea por ejercicio con{' '}
            <b className="text-fg">series×reps</b> y, si quieres, la carga: <b className="text-fg">80%</b>,{' '}
            <b className="text-fg">@8</b> (RPE) o <b className="text-fg">100 kg</b>. Las líneas sin series (“Día 1”, “Lunes:”) son días.
            Entiende nombres en inglés (snatch, clean &amp; jerk, squat…).
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={TEXT_EXAMPLE}
            rows={12}
            className="field min-h-60 py-3 font-mono text-sm leading-relaxed"
          />
          <button
            onClick={() => accept(parseRoutineText(text, exercises))}
            disabled={!text.trim()}
            className="btn btn-primary h-14 w-full text-lg"
          >
            <Sparkles size={20} /> Analizar
          </button>
        </section>
      )}

      {tab === 'file' && (
        <section className="flex flex-col gap-3">
          <label className={`btn btn-primary h-14 w-full text-lg ${busy ? 'opacity-60' : ''}`}>
            <FileUp size={22} /> {busy ? 'Leyendo…' : 'Elegir archivo'}
            <input
              type="file"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void readFile(f);
              }}
            />
          </label>
          <ul className="card flex flex-col gap-2 p-4 text-sm text-muted">
            <li>
              <b className="text-fg">Rutina de Fuerza (.json)</b>: la que te comparte otra persona desde Rutinas → ⋮ → Compartir.
            </li>
            <li>
              <b className="text-fg">Excel (.xlsx) o CSV</b>: una fila por ejercicio con columnas <b className="text-fg">Día · Ejercicio · Series · Reps · Carga</b>{' '}
              (opcionales: Descanso, Tipo, Notas). Las celdas de Día vacías continúan el día anterior.
            </li>
            <li>
              <b className="text-fg">Texto (.txt)</b>: el mismo formato que la pestaña Texto.
            </li>
          </ul>
          <button
            onClick={() => void shareFile('ejemplo-rutina.csv', '﻿' + CSV_EXAMPLE, 'text/csv', 'Ejemplo de rutina')}
            className="btn btn-ghost h-12 w-full"
          >
            <FileSpreadsheet size={20} /> Descargar ejemplo para Excel
          </button>
        </section>
      )}
    </div>
  );
}

/* ---------- Revisión antes de guardar ---------- */

function summarize(de: DraftExercise): string {
  const parts = groupSets(de.sets).map(({ count, set }) => {
    const t = describeTarget(set.target);
    const type = set.type !== 'working' ? ` ${SET_TYPES[set.type].label.toLowerCase()}` : '';
    return `${count}×${set.reps}${t ? ` ${t}` : ''}${type}`;
  });
  if (de.restSec) parts.push(`desc. ${Math.floor(de.restSec / 60)}:${String(de.restSec % 60).padStart(2, '0')}`);
  return parts.join(' · ');
}

function DraftReview({
  draft,
  exercises,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  draft: RoutineDraft;
  exercises: Exercise[];
  busy: boolean;
  onChange: (d: RoutineDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const [editing, setEditing] = useState<{ d: number; e: number } | null>(null);
  const [picker, setPicker] = useState(false);

  const all = draft.days.flatMap((d) => d.exercises);
  const newCount = new Set(all.filter((x) => x.exerciseId == null).map((x) => (x.definition?.name ?? x.rawName).toLowerCase())).size;
  const fuzzyCount = all.filter((x) => x.fuzzy).length;
  const current = editing ? draft.days[editing.d].exercises[editing.e] : null;

  const patch = (fn: (x: DraftExercise) => void) => {
    if (!editing) return;
    const next = structuredClone(draft);
    fn(next.days[editing.d].exercises[editing.e]);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <button onClick={onCancel} className="-ml-2 flex h-11 items-center gap-1 self-start text-muted">
        <ChevronLeft size={22} /> Volver
      </button>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted">Nombre de la rutina</span>
        <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} className="field text-lg font-bold" />
      </label>

      <p className="text-sm text-muted">
        {draft.days.length} {draft.days.length === 1 ? 'día' : 'días'} · {all.length} ejercicios
        {newCount > 0 && ` · ${newCount} ${newCount === 1 ? 'nuevo' : 'nuevos'} (se crearán)`}
        {fuzzyCount > 0 && ` · ${fuzzyCount} por revisar`}. Toca un ejercicio para cambiarlo.
      </p>

      {draft.warnings.map((w, i) => (
        <p key={i} className="flex gap-2 rounded-xl border border-warmup/50 bg-warmup/10 p-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warmup" /> {w}
        </p>
      ))}

      {draft.days.map((day, d) => (
        <section key={d} className="card p-4">
          <h2 className="font-bold">{day.name}</h2>
          <ul className="mt-2 flex flex-col">
            {day.exercises.map((x, e) => {
              const ex = x.exerciseId != null ? byId.get(x.exerciseId) : undefined;
              return (
                <li key={e}>
                  <button
                    onClick={() => setEditing({ d, e })}
                    className="flex w-full flex-col gap-0.5 border-b border-line py-2.5 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-semibold">{ex?.name ?? x.definition?.name ?? x.rawName}</span>
                      {!ex && <Badge tone="new">Nuevo</Badge>}
                      {ex && x.fuzzy && <Badge tone="warn">¿Correcto?</Badge>}
                    </span>
                    {ex && x.fuzzy && <span className="text-xs text-muted">Escrito: “{x.rawName}”</span>}
                    <span className="text-sm text-muted tabular-nums">{summarize(x)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="sticky bottom-20 z-10 flex gap-2 pb-2">
        <button onClick={onCancel} className="btn h-14 flex-1 border border-line bg-bg">
          Cancelar
        </button>
        <button onClick={onSave} disabled={busy} className="btn btn-primary h-14 flex-[2] text-lg">
          Guardar rutina
        </button>
      </div>

      <BottomSheet open={editing !== null && !picker} onClose={() => setEditing(null)} title={current?.rawName}>
        <div className="flex flex-col gap-2 pb-2">
          <button className="btn btn-ghost justify-start" onClick={() => setPicker(true)}>
            <Replace size={20} /> Elegir otro ejercicio de la biblioteca
          </button>
          {current?.exerciseId != null && (
            <button
              className="btn btn-ghost justify-start"
              onClick={() => {
                patch((x) => {
                  x.exerciseId = undefined;
                  x.fuzzy = false;
                });
                setEditing(null);
              }}
            >
              <Sparkles size={20} /> Crear “{current.rawName}” como ejercicio nuevo
            </button>
          )}
          {current?.fuzzy && (
            <button
              className="btn btn-primary"
              onClick={() => {
                patch((x) => void (x.fuzzy = false));
                setEditing(null);
              }}
            >
              Sí, es correcto
            </button>
          )}
        </div>
      </BottomSheet>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(id) => {
          patch((x) => {
            x.exerciseId = id;
            x.fuzzy = false;
          });
          setPicker(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function Badge({ tone, children }: { tone: 'new' | 'warn'; children: React.ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        tone === 'new' ? 'bg-backoff/15 text-backoff' : 'bg-warmup/15 text-warmup'
      }`}
    >
      {children}
    </span>
  );
}
