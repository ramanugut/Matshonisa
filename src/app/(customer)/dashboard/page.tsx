import Link from 'next/link';
import { requireCustomer } from '@/lib/session';
import { Badge, Card, Empty, Flash, PageHeader, Progress, Stat } from '@/components/ui';
import { D, R, R0 } from '@/lib/format';

export const metadata = { title: 'Dashboard' };
const OPEN = ['awaiting_acceptance', 'awaiting_disbursement', 'active', 'overdue'];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const q = await searchParams;
  const { supabase, customer: c } = await requireCustomer();
  const [{ data: loans }, { data: apps }, { data: pays }, { data: docs }] = await Promise.all([
    supabase.from('loans').select('*').eq('customer_id', c.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
    supabase.from('applications').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(3),
    supabase.from('payments').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(4),
    supabase.from('documents').select('kind,status').eq('customer_id', c.id),
  ]);
  const loan = loans?.find((l) => OPEN.includes(l.status)) ?? null;
  const { data: inst } = loan ? await supabase.from('installments').select('*').eq('loan_id', loan.id).order('no') : { data: [] };
  const next = inst?.find((i) => i.status !== 'paid');
  const pending = apps?.find((a) => ['pending', 'under_review'].includes(a.status));
  const profileDone = !!(c.id_number && c.phone && c.monthly_income && c.bank_name && c.account_number);
  const verified = new Set((docs ?? []).filter((d) => d.status === 'verified').map((d) => d.kind)).size;
  const paidPct = loan ? (Number(loan.paid_total) / Number(loan.total_repayable)) * 100 : 0;

  return (
    <>
      <PageHeader title={`Hi ${c.full_name.split(' ')[0] || 'there'} 👋`} sub="Here’s where things stand." actions={!loan && !pending && <Link href="/apply" className="btn-primary">Apply for a loan</Link>} />
      <Flash ok={q.ok} err={q.err} />

      {!profileDone && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span><b>Complete your profile</b> (income and bank details) so you can apply.</span>
          <Link href="/profile" className="btn bg-amber-900 text-white">Complete profile</Link>
        </div>
      )}

      {loan ? (
        <section className="mb-6 overflow-hidden rounded-3xl bg-grad-deep p-6 text-white shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-widest text-brand-light">Loan {loan.ref}</div>
              <div className="mt-1 text-4xl font-extrabold">{R(Number(loan.total_repayable) - Number(loan.paid_total))}</div>
              <div className="text-sm text-slate-300">outstanding of {R(loan.total_repayable)}</div></div>
            <Badge status={loan.status} />
          </div>
          <div className="mt-5"><Progress value={paidPct} /><div className="mt-1.5 text-xs text-slate-300">{Math.round(paidPct)}% repaid</div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {loan.status === 'awaiting_acceptance' ? <p className="text-sm">Your loan is approved. Review and accept the agreement to get paid.</p>
              : loan.status === 'awaiting_disbursement' ? <p className="text-sm">Agreement accepted. We’re preparing your payout of {R(loan.principal)}.</p>
              : next ? <p className="text-sm">Next instalment <b>{R(Number(next.amount) - Number(next.paid_amount))}</b> due <b>{D(next.due_date)}</b></p> : <span />}
            <div className="flex gap-2">
              <Link href={`/loans/${loan.id}`} className="btn border border-white/30 text-white hover:bg-white/10">View loan</Link>
              {loan.status === 'awaiting_acceptance' && <Link href={`/loans/${loan.id}/agreement`} className="btn-primary">Review & accept</Link>}
              {['active', 'overdue'].includes(loan.status) && <Link href={`/loans/${loan.id}/pay`} className="btn-primary">Make a payment</Link>}
            </div>
          </div>
        </section>
      ) : pending ? (
        <Card className="mb-6" title="Application in progress">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{pending.ref} · {R0(pending.amount)} over {pending.months} months</p><div className="flex items-center gap-3"><Badge status={pending.status} /><Link href={`/applications/${pending.id}`} className="btn-ghost">Track status</Link></div></div>
        </Card>
      ) : (
        <div className="mb-6 grid items-center gap-4 overflow-hidden rounded-3xl bg-grad-deep p-6 text-white sm:grid-cols-[1fr_auto] sm:p-8">
          <div><h2 className="text-2xl font-extrabold !text-white">Need cash? Get a quote in seconds.</h2><p className="mt-1 text-sm text-slate-300">Borrow from R500 to R8 000. See every fee before you commit.</p><Link href="/apply" className="btn-primary mt-4">Apply now</Link></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/money.svg" alt="" className="hidden h-32 sm:block" />
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total borrowed" value={R0(loans?.reduce((a, l) => a + Number(l.principal), 0))} />
        <Stat label="Total repaid" value={R0(loans?.reduce((a, l) => a + Number(l.paid_total), 0))} tone="green" />
        <Stat label="Next due" value={next ? D(next.due_date) : '—'} sub={next ? R(Number(next.amount) - Number(next.paid_amount)) : undefined} />
        <Stat label="Documents verified" value={`${verified}/4`} sub="ID, address, payslip, statements" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent payments" actions={<Link className="text-sm font-semibold text-brand-600" href="/history">View all</Link>}>
          {pays?.length ? pays.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0">
              <div><div className="font-semibold">{R(p.amount)}</div><div className="text-xs text-slate-500">{D(p.created_at)} · {p.method}</div></div>
              <Link href={`/receipt/${p.reference}`} className="text-xs font-semibold text-navy">Receipt</Link>
            </div>)) : <Empty title="No payments yet" sub="Payments will show here once your loan is active." />}
        </Card>
        <Card title="Applications">
          {apps?.length ? apps.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 hover:bg-slate-50">
              <div><div className="font-semibold">{a.ref} · {R0(a.amount)}</div><div className="text-xs text-slate-500">{D(a.created_at)} · {a.months} months</div></div><Badge status={a.status} />
            </Link>)) : <Empty title="No applications yet" sub="Your applications will appear here." />}
        </Card>
      </div>
    </>
  );
}
