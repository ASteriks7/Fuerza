import { useRef, useState } from 'react';
import { Download, Minus, Plus, Upload, Volume2 } from 'lucide-react';
import { ALL_PLATES, saveSetting, useSettings, type AppSettings } from '../../db/settings';
import { downloadJson, exportBackup, importBackup, parseBackup, type Backup } from '../../db/backup';
import { beep, notificationsSupported, requestNotifyPermission, unlockAudio, vibrate, VIBRATE_REST_DONE } from '../../lib/alerts';
import { fmtClock, fmtNum } from '../../lib/format';
import { Toggle } from '../../components/ui/Toggle';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function SettingsPage() {
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const toggleNotify = async (on: boolean) => {
    if (!on) return saveSetting('restNotify', false);
    const granted = await requestNotifyPermission();
    await saveSetting('restNotify', granted);
    if (!granted) {
      setMsg({
        text: 'Permiso de notificaciones denegado. Actívalo en los ajustes del navegador para esta app.',
        error: true,
      });
    }
  };

  const doExport = async () => {
    const data = await exportBackup();
    downloadJson(data, `fuerza-respaldo-${new Date().toISOString().slice(0, 10)}.json`);
    setMsg({ text: `Respaldo exportado (${data.tables.workouts.length} entrenamientos).` });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-3xl font-black">Ajustes</h1>

      <section className="card px-4 py-2">
        <h2 className="pt-2 pb-1 text-sm font-semibold tracking-wide text-muted uppercase">Descanso</h2>
        <Stepper label="Series efectivas" k="restWorkingSec" value={s.restWorkingSec} />
        <Stepper label="Calentamiento" k="restWarmupSec" value={s.restWarmupSec} />
        <Toggle label="Sonido" checked={s.restSound} onChange={(v) => saveSetting('restSound', v)} />
        <Toggle label="Vibración" checked={s.restVibrate} onChange={(v) => saveSetting('restVibrate', v)} />
        {notificationsSupported() && (
          <Toggle
            label="Notificación con pantalla bloqueada"
            hint="Avisa aunque la app esté en segundo plano"
            checked={s.restNotify}
            onChange={toggleNotify}
          />
        )}
        <Toggle
          label="Mantener pantalla encendida"
          hint="Durante el entrenamiento. El temporizador es más fiable así."
          checked={s.keepScreenOn}
          onChange={(v) => saveSetting('keepScreenOn', v)}
        />
        <button
          onClick={() => {
            unlockAudio();
            beep();
            vibrate(VIBRATE_REST_DONE);
          }}
          className="btn btn-ghost my-2 w-full"
        >
          <Volume2 size={20} /> Probar alerta
        </button>
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Discos y cargas</h2>
        <div className="flex flex-col gap-2">
          <span className="font-medium">Discos disponibles</span>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATES.map((p) => {
              const on = s.availablePlates.includes(p);
              return (
                <button
                  key={p}
                  className="chip h-11 min-w-14 justify-center text-base"
                  data-active={on}
                  onClick={() =>
                    saveSetting(
                      'availablePlates',
                      on ? s.availablePlates.filter((x) => x !== p) : [...s.availablePlates, p],
                    )
                  }
                >
                  {fmtNum(p)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium">Redondeo de cargas por %1RM</span>
          <div className="flex gap-2">
            {[1.25, 2.5, 5].map((inc) => (
              <button
                key={inc}
                className="chip h-11 min-w-16 justify-center text-base"
                data-active={s.loadIncrement === inc}
                onClick={() => saveSetting('loadIncrement', inc)}
              >
                {fmtNum(inc)} kg
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Respaldo</h2>
        <p className="text-sm text-muted">
          Tus datos solo viven en este dispositivo. Exporta un respaldo de vez en cuando.
        </p>
        <button onClick={doExport} className="btn btn-ghost w-full">
          <Download size={20} /> Exportar JSON
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn btn-ghost w-full">
          <Upload size={20} /> Importar JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {msg && <p className={`text-sm ${msg.error ? 'text-danger' : 'text-ok'}`}>{msg.text}</p>}
      </section>

      <p className="pb-4 text-center text-xs text-muted">Fuerza · v0.5.0</p>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="¿Reemplazar todos los datos?"
        message={
          pending
            ? `El respaldo del ${new Date(pending.exportedAt).toLocaleDateString('es')} contiene ${pending.tables.workouts.length} entrenamientos. Se borrará todo lo que hay ahora en este dispositivo.`
            : undefined
        }
        confirmLabel="Reemplazar"
        danger
        onConfirm={async () => {
          if (!pending) return;
          try {
            await importBackup(pending);
            setMsg({ text: 'Respaldo importado correctamente.' });
          } catch (e) {
            setMsg({ text: `No se pudo importar: ${(e as Error).message}`, error: true });
          }
        }}
      />
    </div>
  );
}

type SecKey = { [K in keyof AppSettings]: AppSettings[K] extends number ? K : never }[keyof AppSettings];

function Stepper({ label, k, value }: { label: string; k: SecKey; value: number }) {
  const set = (v: number) => saveSetting(k, Math.min(900, Math.max(15, v)));
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-2">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => set(value - 15)} className="btn btn-ghost size-11 px-0" aria-label="Menos 15 segundos">
          <Minus size={18} />
        </button>
        <span className="w-14 text-center text-lg font-bold tabular-nums">{fmtClock(value)}</span>
        <button onClick={() => set(value + 15)} className="btn btn-ghost size-11 px-0" aria-label="Más 15 segundos">
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
