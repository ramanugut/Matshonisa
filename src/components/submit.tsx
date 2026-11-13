'use client';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

export function Submit({ children, className = 'btn-primary', pending = 'Working…', confirm, disabled }: { children: ReactNode; className?: string; pending?: string; confirm?: string; disabled?: boolean }) {
  const { pending: p } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={p || disabled}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {p ? pending : children}
    </button>
  );
}
