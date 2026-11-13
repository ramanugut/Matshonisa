'use client';
import Link from 'next/link';
import { useState } from 'react';
import { quote, type Fees, type Rules } from '@/lib/quote';
import { R, R0 } from '@/lib/format';

export function Calculator({ rules, fees, cta = '/register', ctaLabel = 'Apply for this loan', onChange, compact = false, initial }:
  { rules: Rules; fees: Fees; cta?: string; ctaLabel?: string; compact?: boolean; initial?: { amount: number; months: number }; onChange?: (a: number, m: number) => void }) {
  const [amount, setAmount] = useState(initial?.amount ?? 3000);
  const [months, setMonths] = useState(initial?.months ?? 3);
  const q = quote(amount, months, fees);
  const set = (a: number, m: number) => { setAmount(a); setMonths(m); onChange?.(a, m); };
  return (
    <div className={compact ? '' : 'card p-6 sm:p-8'}>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-7">
          <div>
            <div className="flex items-end justify-between"><span className="label !mb-0">I need</span><span className="text-3xl font-extrabold text-navy-900">{R0(amount)}</span></div>
            <input aria-label="Loan amount" type="range" min={rules.min_amount} max={rules.max_amount} step={100} value={amount}
              onChange={(e) => set(Number(e.target.value), months)} className="mt-3 w-full accent-brand" />
            <div className="flex justify-between text-xs text-slate-400"><span>{R0(rules.min_amount)}</span><span>{R0(rules.max_amount)}</span></div>
          </div>
          <div>
            <div className="flex items-end justify-between"><span className="label !mb-0">Repay over</span><span className="text-3xl font-extrabold text-navy-900">{months} {months === 1 ? 'month' : 'months'}</span></div>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {Array.from({ length: rules.max_months - rules.min_months + 1 }, (_, i) => rules.min_months + i).map((m) => (
                <button key={m} type="button" onClick={() => set(amount, m)} aria-pressed={m === months}
                  className={`rounded-xl py-2.5 text-sm font-bold ring-1 ring-inset ${m === months ? 'bg-navy text-white ring-navy' : 'bg-white text-navy-900 ring-slate-200 hover:bg-slate-50'}`}>{m}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-grad-soft p-5 ring-1 ring-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly instalment</div>
          <div className="text-4xl font-extrabold text-brand-600">{R(q.monthly)}</div>
          <dl className="mt-4 space-y-2 text-sm">
            {[['Loan amount', q.principal], ['Interest (5% per month)', q.interest], ['Monthly service fees', q.service_fees], ['Initiation fee', q.initiation_fee]].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{R(Number(v))}</dd></div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><dt className="font-bold">Total to repay</dt><dd className="font-extrabold text-navy-900">{R(q.total)}</dd></div>
          </dl>
          {!compact && <Link href={`${cta}?amount=${amount}&months=${months}`} className="btn-primary mt-5 w-full">{ctaLabel}</Link>}
        </div>
      </div>
    </div>
  );
}
