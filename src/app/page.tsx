import Link from 'next/link';
import { PublicNav, Footer } from '@/components/public';
import { Calculator } from '@/components/calculator';
import { createClient } from '@/lib/supabase/server';
import { loadRules } from '@/lib/quote';
import { R0 } from '@/lib/format';

const STEPS = [
  { img: 'step1', t: 'Apply online', d: 'Create an account, complete your profile and pick the amount and term you need.' },
  { img: 'step2', t: 'Get a quick decision', d: 'We assess affordability and credit instantly. Many applications are approved automatically.' },
  { img: 'step3', t: 'Receive and repay', d: 'Accept your agreement, get paid to your bank account, and repay monthly — or settle early.' },
];
const FEATURES = [
  ['Transparent pricing', 'Every fee is shown before you accept. No surprises, no hidden charges.'],
  ['Flexible repayments', 'Pay in full or make partial payments any time from your account or a secure link.'],
  ['Secure & private', 'Your documents and data are encrypted and only visible to you and our credit team.'],
  ['Reminders that help', 'Friendly reminders with a one-tap payment link before every due date.'],
];
const FAQ = [
  ['Who can apply?', 'South African citizens or permanent residents aged 18+, with a regular income and an active bank account.'],
  ['How fast is the decision?', 'Most applications are assessed instantly. Some need a quick manual review, usually within one business day.'],
  ['What does it cost?', 'Interest, a monthly service fee and a once-off initiation fee. The calculator above shows the exact total before you apply.'],
  ['Can I repay early?', 'Yes. You can pay any amount at any time, and settle the loan early from your account.'],
  ['What documents do I need?', 'A copy of your ID, proof of address, your latest payslip and three months of bank statements.'],
];

export default async function Landing() {
  const supabase = await createClient();
  const { rules, fees } = await loadRules(supabase);
  return (
    <>
      <div className="bg-grad-deep">
        <PublicNav />
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-8 lg:grid-cols-2">
          <div className="text-white">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-light ring-1 ring-white/20">Quick loans · Flexible repayments</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] !text-white sm:text-5xl">Cash when you need it. <span className="text-brand-light">Costs you can see.</span></h1>
            <p className="mt-5 max-w-lg text-lg text-slate-200">Borrow {R0(rules.min_amount)} to {R0(rules.max_amount)} over {rules.min_months}–{rules.max_months} months. Apply online in minutes and track everything from your phone.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/start" className="btn-primary px-6 py-3 text-base">Apply now</Link>
              <a href="#calculator" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">Try the calculator</a>
            </div>
            <div className="mt-8 flex gap-8 text-sm text-slate-300">
              <div><b className="block text-2xl text-white">{R0(rules.max_amount)}</b>max loan</div>
              <div><b className="block text-2xl text-white">Instant</b>decisions</div>
              <div><b className="block text-2xl text-white">100%</b>online</div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/hero.svg" alt="Machonisa app on a phone" className="mx-auto w-full max-w-lg" />
        </section>
      </div>

      <section id="calculator" className="mx-auto -mt-10 max-w-5xl px-5">
        <Calculator rules={rules} fees={fees} />
        <p className="mt-3 text-center text-xs text-slate-500">Example only. Your final quote is confirmed after your affordability and credit assessment.</p>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-extrabold">How it works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.t} className="card p-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/img/${s.img}.svg`} alt="" className="mx-auto h-36" />
              <div className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-600">Step {i + 1}</div>
              <h3 className="mt-1 text-lg font-bold">{s.t}</h3><p className="mt-1 text-sm text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-navy-50/60 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/money.svg" alt="" className="mx-auto w-full max-w-md" />
          <div>
            <h2 className="text-3xl font-extrabold">Built to be fair and clear</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {FEATURES.map(([t, d]) => (
                <div key={t} className="rounded-2xl bg-white p-4 shadow-card"><div className="mb-1 h-1.5 w-8 rounded-full bg-grad-green" /><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card p-7"><h2 className="text-2xl font-extrabold">What you need</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {['South African ID, aged 18 or older', 'Regular monthly income of at least R2 500', 'An active South African bank account in your name', 'ID copy, proof of address, latest payslip, 3 months bank statements'].map((x) => (
                <li key={x} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">✓</span>{x}</li>))}
            </ul>
          </div>
          <div id="faq"><h2 className="text-2xl font-extrabold">Frequently asked</h2>
            <div className="mt-4 space-y-3">{FAQ.map(([q, a]) => (
              <details key={q} className="group card px-5 py-4"><summary className="cursor-pointer list-none font-bold text-navy-900">{q}</summary><p className="mt-2 text-sm text-slate-500">{a}</p></details>))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="overflow-hidden rounded-3xl bg-grad-deep px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-extrabold !text-white">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-200">Create your account and get a decision today.</p>
          <Link href="/start" className="btn-primary mt-6 px-7 py-3 text-base">Apply now</Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
