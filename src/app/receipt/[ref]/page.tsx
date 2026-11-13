import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/logo';
import { D, DT, R, label } from '@/lib/format';
import { PrintButton } from '@/components/print-button';

export const metadata = { title: 'Payment receipt' };
export default async function Receipt({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase.rpc('get_receipt', { p_ref: ref });
  if (!r) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-screen bg-grad-soft px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex justify-center"><Link href="/"><Logo /></Link></div>
        <div className="card overflow-hidden">
          <div className="bg-grad-green p-8 text-center text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/success.svg" alt="" className="mx-auto h-24" />
            <h1 className="mt-3 text-2xl font-extrabold !text-white">Payment received</h1>
            <div className="mt-1 text-4xl font-extrabold">{R(r.amount)}</div>
          </div>
          <dl className="space-y-3 p-6 text-sm">
            {[['Reference', r.reference], ['Date', DT(r.date)], ['Customer', r.customer], ['Loan', r.loan_ref], ['Method', label(r.method)], ['Outstanding balance', R(r.outstanding)]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-100 pb-3 last:border-0"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-navy-900">{v}</dd></div>))}
          </dl>
          {r.loan_status === 'paid' && <div className="mx-6 mb-6 rounded-xl bg-brand-50 p-4 text-center text-sm font-semibold text-brand-700">🎉 Your loan is fully repaid. Thank you!</div>}
          <div className="flex gap-2 border-t border-slate-100 p-4 print:hidden">
            <PrintButton />
            {user && <Link href="/dashboard" className="btn-navy flex-1">Back to dashboard</Link>}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Generated {D(new Date())}. Keep this receipt for your records.</p>
      </div>
    </main>
  );
}
