const numFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

/** 102.5 → "102,5" o "102.5" según el idioma del dispositivo. */
export function fmtNum(n: number | undefined): string {
  return n == null ? '' : numFmt.format(n);
}

/** Acepta coma o punto decimal. Devuelve undefined si está vacío o no es número. */
export function parseNum(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

const dateFmt = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

export function fmtDate(ts: number): string {
  return dateFmt.format(ts);
}

export function fmtTime(ts: number): string {
  return timeFmt.format(ts);
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
