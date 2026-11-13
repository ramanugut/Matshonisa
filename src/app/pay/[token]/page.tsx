import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/logo';
import { Flash } from '@/components/ui';
import { PayForm } from '@/components/pay-form';
import { payByToken } from '@/app/actions/public';
import { D, R } from '@/lib/format';

export const metadata = { title: 'Pay your instalment', robots: { index: false } };
export default async function PayRequest({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ err?: string }> }) {
  const { token } = await params; const q = await searchParams;
  const supabase = await createClient();
  const { data: r } = await supabase.rpc('get_payment_request', { p_token: token });
  if (!r) notFound();
  const open = r.status === 'open';
  return (
    <main className="min-h-screen bg-grad-deep px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex justify-center"><Link href="/"><Logo light /></Link></div>
        <div className="card overflow-hidden">
          <div className="bg-grad-soft p-6 text-center">
            <div className="text-sm text-slate-500">Hi {r.first_name}, you have a payment request for loan {r.loan_ref}</div>
            <div className="mt-1 text-4xl font-extrabold text-navy-900">{R(r.amount)}</div>
            {r.due_date && <div className="text-sm text-slate-500">Due {D(r.due_date)}</div>}
            {r.note && <div className="mt-2 text-xs text-slate-400">{r.note}</div>}
          </div>
          <div className="p-6">
            <Flash err={q.err} />
            {open ? (
              <PayForm action={payByToken} hidden={{ token }} full={Number(r.outstanding)} instalment={Math.min(Number(r.amount), Number(r.outstanding))} min={Number(r.min_payment)} token />
            ) : (
              <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-600">
                This payment request is <b>{r.status}</b>. {r.status === 'paid' ? 'Thank you — no further action is needed.' : 'Please contact us or sign in to pay.'}
                <div className="mt-4"><Link href="/login" className="btn-navy">Sign in</Link></div>
              </div>)}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-300">Secure payment link · no sign-in required</p>
      </div>
    </main>
  );
}
