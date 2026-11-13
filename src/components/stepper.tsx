import Link from 'next/link';

export type Step = { key: string; label: string; href?: string };

export function Stepper({ steps, current }: { steps: Step[]; current: string }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <ol className="mb-8 grid grid-cols-4 gap-2">
      {steps.map((s, i) => {
        const done = i < idx, now = i === idx;
        const inner = (
          <>
            <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${done ? 'bg-brand text-white' : now ? 'bg-navy text-white' : 'bg-slate-200 text-slate-500'}`}>{done ? '✓' : i + 1}</span>
            <span className={`mt-1.5 block text-center text-[11px] font-semibold leading-tight sm:text-xs ${now ? 'text-navy-900' : 'text-slate-500'}`}>{s.label}</span>
          </>
        );
        return <li key={s.key}>{done && s.href ? <Link href={s.href} className="block">{inner}</Link> : <div>{inner}</div>}</li>;
      })}
    </ol>
  );
}
