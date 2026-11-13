import Link from 'next/link';
import { Calculator } from '@/components/calculator';
import { Footer, PublicNav } from '@/components/public';
import { getSession } from '@/lib/session';
import { loadRules } from '@/lib/quote';
import { R0 } from '@/lib/format';

export const metadata = { title: 'How much do you need?' };
export const dynamic = 'force-dynamic';

export default async function Start({ searchParams }: { searchParams: Promise<{ amount?: string; months?: string }> }) {
  const q = await searchParams;
  const { supabase, profile } = await getSession();
  const { rules, fees } = await loadRules(supabase);
  const amount = Math.min(rules.max_amount, Math.max(rules.min_amount, Number(q.amount) || 3000));
  const months = Math.min(rules.max_months, Math.max(rules.min_months, Number(q.months) || 3));
  const customer = profile?.role === 'customer';
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-grad-deep pb-24">
        <PublicNav />
        <div className="mx-auto max-w-3xl px-5 pt-4 text-center text-white">
          <h1 className="text-3xl font-extrabold !text-white sm:text-4xl">How much do you need?</h1>
          <p className="mt-2 text-slate-200">Choose an amount and how long you want to repay. You’ll see every cost before you commit — no account needed yet.</p>
        </div>
      </div>
      <main className="mx-auto -mt-16 max-w-5xl px-5 pb-16">
        <Calculator rules={rules} fees={fees} initial={{ amount, months }} cta={customer ? '/apply' : '/register'} ctaLabel={customer ? 'Continue my application' : 'Continue — create my account'} />
        <div className="mt-8 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
          <div className="card p-4"><b className="text-navy-900">Next: your account</b><p className="mt-1">Create a free account with your ID number and cellphone. We read your date of birth from your ID.</p></div>
          <div className="card p-4"><b className="text-navy-900">Then: your details & documents</b><p className="mt-1">Tell us about your income and expenses and upload your ID, proof of address, payslip and bank statements.</p></div>
          <div className="card p-4"><b className="text-navy-900">Finally: a decision</b><p className="mt-1">Most applications are assessed instantly. You only get paid after you accept the agreement.</p></div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">Borrow {R0(rules.min_amount)}–{R0(rules.max_amount)} over {rules.min_months}–{rules.max_months} months. Interest is charged at 5% per month, which is the legal maximum for short-term credit. Only borrow what you can afford to repay. <Link href="/login" className="font-semibold text-navy underline">Already have an account?</Link></p>
      </main>
      <Footer />
    </div>
  );
}
