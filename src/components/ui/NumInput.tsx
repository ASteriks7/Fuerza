import { useEffect, useRef, useState } from 'react';
import { fmtNum, parseNum } from '../../lib/format';

interface Props {
  value: number | undefined;
  onCommit: (v: number | undefined) => void;
  placeholder?: string;
  integer?: boolean;
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
}

/**
 * Campo numérico con texto local mientras se escribe (permite “72,” o “72.”)
 * y que guarda al perder el foco o pulsar Enter.
 */
export function NumInput({ value, onCommit, placeholder, integer, className = '', ariaLabel, disabled }: Props) {
  const [text, setText] = useState(fmtNum(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== ref.current) setText(fmtNum(value));
  }, [value]);

  const commit = () => {
    let n = parseNum(text);
    if (n != null && integer) n = Math.round(n);
    setText(fmtNum(n));
    if (n !== value) onCommit(n);
  };

  return (
    <input
      ref={ref}
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      inputMode={integer ? 'numeric' : 'decimal'}
      enterKeyHint="done"
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`h-11 w-full min-w-0 rounded-lg bg-surface-2 text-center text-lg font-semibold tabular-nums outline-none placeholder:text-muted/50 focus:ring-2 focus:ring-accent disabled:opacity-30 ${className}`}
    />
  );
}
