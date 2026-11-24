interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}

export function Toggle({ checked, onChange, label, hint }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 py-2 text-left"
    >
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-surface-2'}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </span>
    </button>
  );
}
