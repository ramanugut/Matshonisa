'use client';
import { useState } from 'react';
import { Submit } from './submit';
import { R } from '@/lib/format';

export function PayForm({ action, hidden, full, instalment, min, disabled, token }:
  { action: (fd: FormData) => void; hidden: Record<string, string>; full: number; instalment: number; min: number; disabled?: boolean; token?: boolean }) {
  const [mode, setMode] = useState<'instalment' | 'full' | 'custom'>('instalment');
  const [custom, setCustom] = useState('');
  const amount = mode === 'full' ? full : mode === 'instalment' ? instalment : Number(custom || 0);
  const invalid = amount < Math.min(min, full) || amount > full;
  const opts: [typeof mode, string, number | null][] = [['instalment', 'Pay instalment', instalment], ['full', 'Settle in full', full], ['custom', 'Other amount', null]];
  return (
    <form action={action} className="space-y-5">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="mode" value={mode} /><input type="hidden" name="instalment" value={instalment} /><input type="hidden" name="full" value={full} />
      <div className="grid gap-3 sm:grid-cols-3">
        {opts.map(([m, t, v]) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
            className={`rounded-2xl border-2 p-4 text-left transition ${mode === m ? 'border-brand bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t}</div>
            <div className="mt-1 text-lg font-extrabold text-navy-900">{v === null ? 'Custom' : R(v)}</div>
          </button>))}
      </div>
      {mode === 'custom' && (
        <div><label className="label" htmlFor="custom">Amount (min {R(Math.min(min, full))}, max {R(full)})</label>
          <input id="custom" name="custom" type="number" step="0.01" min={Math.min(min, full)} max={full} value={custom} onChange={(e) => setCustom(e.target.value)} className="input" required /></div>)}
      {!token && (
        <div><label className="label" htmlFor="method">Pay with</label>
          <select id="method" name="method" className="input" defaultValue="card"><option value="card">Debit / credit card</option><option value="instant_eft">Instant EFT</option></select></div>)}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><span className="text-sm text-slate-500">You’re paying</span><span className="text-2xl font-extrabold text-navy-900">{R(invalid ? 0 : amount)}</span></div>
      <Submit className="btn-primary w-full" pending="Processing…" disabled={invalid || disabled}>Pay securely</Submit>
      <p className="text-center text-xs text-slate-400">Payments are applied to your oldest unpaid instalment first.</p>
    </form>
  );
}
