import Link from 'next/link';
import type { ReactNode } from 'react';
import { label } from '@/lib/format';

const TONE: Record<string, string> = {
  green: 'bg-brand-50 text-brand-700 ring-brand/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  red: 'bg-red-50 text-red-700 ring-red-500/20',
  blue: 'bg-navy-50 text-navy ring-navy/15',
  gray: 'bg-slate-100 text-slate-600 ring-slate-400/20',
};
const STATUS_TONE: Record<string, string> = {
  active: 'green', paid: 'green', approved: 'green', verified: 'green', success: 'green', accepted: 'green', open: 'blue',
  pending: 'amber', under_review: 'amber', queued: 'amber', awaiting_acceptance: 'amber', awaiting_disbursement: 'amber', due: 'amber', partial: 'amber',
  overdue: 'red', declined: 'red', rejected: 'red', failed: 'red', suspended: 'red', written_off: 'red',
  cancelled: 'gray', expired: 'gray', refunded: 'gray',
};
export function Badge({ status, children }: { status?: string; children?: ReactNode }) {
  const tone = TONE[STATUS_TONE[status ?? ''] ?? 'gray'];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>{children ?? label(status ?? '')}</span>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = '', actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || actions) && <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-base font-bold">{title}</h2>{actions}</div>}
      {children}
    </section>
  );
}

export function Stat({ label: l, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: 'navy' | 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-brand-600' : tone === 'red' ? 'text-red-600' : 'text-navy-900';
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</div>
      <div className={`mt-1.5 text-xl font-extrabold sm:text-2xl ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${err ? 'border-red-200 bg-red-50 text-red-700' : 'border-brand/30 bg-brand-50 text-brand-700'}`}>
      {err || ok}
    </div>
  );
}

export function Empty({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="text-base font-bold text-navy-900">{title}</div>
      {sub && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label: l, name, type = 'text', defaultValue, required, placeholder, hint, ...rest }:
  { label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string; hint?: string } & Record<string, unknown>) {
  return (
    <div>
      <label className="label" htmlFor={name}>{l}{required && ' *'}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} className="input" {...rest} />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Select({ label: l, name, options, defaultValue }: { label: string; name: string; options: string[] | { value: string; label: string }[]; defaultValue?: string | null }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{l}</label>
      <select id={name} name={name} defaultValue={defaultValue ?? ''} className="input">
        {options.map((o) => { const v = typeof o === 'string' ? o : o.value; const t = typeof o === 'string' ? o : o.label; return <option key={v} value={v}>{t}</option>; })}
      </select>
    </div>
  );
}

export function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0"><span className="text-slate-500">{k}</span><span className="text-right font-semibold text-navy-900">{v}</span></div>;
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>{head.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
      {empty}
    </div>
  );
}
export const Td = ({ children, className = '' }: { children: ReactNode; className?: string }) => <td className={`px-4 py-3 ${className}`}>{children}</td>;

export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-card ring-1 ring-slate-100">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold ${current === i.key ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{i.label}</Link>
      ))}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-grad-green" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}
