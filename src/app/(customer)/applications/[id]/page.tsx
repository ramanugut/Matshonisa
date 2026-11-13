import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/session';
import { Badge, Card, Flash, PageHeader, Row } from '@/components/ui';
import { Submit } from '@/components/submit';
import { cancelApplication } from '@/app/actions/customer';
import { D, DT, R, label } from '@/lib/format';

export const metadata = { title: 'Application status' };
export default async function ApplicationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, customer: c } = await requireCustomer();
  const { data: a } = await supabase.from('applications').select('*').eq('id', id).eq('customer_id', c.id).single();
  if (!a) notFound();
  const { data: loan } = await supabase.from('loans').select('id,status,ref').eq('application_id', a.id).maybeSingle();
  const qt = a.quote as { interest: number; service_fees: number; initiation_fee: number; total: number; monthly: number };
  const decided = !['pending', 'under_review'].includes(a.status);
  const steps = [
    { t: 'Application submitted', d: DT(a.created_at), done: true },
    { t: 'Assessment', d: a.status === 'under_review' ? 'In manual review' : decided ? 'Completed' : 'In progress', done: decided || a.status === 'under_review' },
    { t: a.status === 'declined' ? 'Declined' : 'Approved', d: decided ? D(a.decided_at) : 'Waiting', done: decided },
    { t: 'Agreement accepted', d: a.status === 'accepted' ? 'Done' : '—', done: a.status === 'accepted' },
  ];
  return (
    <>
      <PageHeader title={`Application ${a.ref}`} sub={`Submitted ${DT(a.created_at)}`} actions={<Badge status={a.status} />} />
      <Flash ok={q.ok} err={q.err} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Card title="Progress">
            <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
              {steps.map((s) => (
                <li key={s.t} className="relative">
                  <span className={`absolute -left-[33px] grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${s.done ? (a.status === 'declined' && s.t === 'Declined' ? 'bg-red-500' : 'bg-brand') : 'bg-slate-300'}`}>{s.done ? '✓' : ''}</span>
                  <div className="font-bold">{s.t}</div><div className="text-sm text-slate-500">{s.d}</div>
                </li>))}
            </ol>
          </Card>
          {a.status === 'approved' && loan?.status === 'awaiting_acceptance' && (
            <div className="rounded-2xl bg-grad-green p-5 text-white shadow-card"><div className="text-lg font-extrabold">You’re approved! 🎉</div>
              <p className="text-sm text-white/90">Review your loan agreement and accept to receive your {R(a.amount)}.</p>
              <Link href={`/loans/${loan.id}/agreement`} className="btn mt-3 bg-white text-navy-900">Review agreement</Link></div>)}
          {a.status === 'declined' && (
            <Card title="Why was this declined?"><p className="text-sm text-slate-600">{a.decision_note || 'We were unable to approve this application at this time.'}</p>
              <p className="mt-2 text-xs text-slate-500">You can apply again once your circumstances change.</p></Card>)}
          {a.status === 'under_review' && <Card><p className="text-sm text-slate-600">Your application needs a quick manual review. We’ll update this page — usually within one business day.</p></Card>}
          {a.status === 'accepted' && loan && <Link href={`/loans/${loan.id}`} className="btn-navy">View your loan</Link>}
        </div>
        <div className="space-y-6">
          <Card title="Loan summary">
            <Row k="Amount" v={R(a.amount)} /><Row k="Term" v={`${a.months} months`} /><Row k="Purpose" v={a.purpose ?? '—'} />
            <Row k="Interest" v={R(qt.interest)} /><Row k="Service fees" v={R(qt.service_fees)} /><Row k="Initiation fee" v={R(qt.initiation_fee)} />
            <Row k="Total to repay" v={R(qt.total)} /><Row k="Monthly instalment" v={R(qt.monthly)} />
            {a.decision_by && <Row k="Decision by" v={label(a.decision_by)} />}
          </Card>
          {['pending', 'under_review', 'approved'].includes(a.status) && loan?.status !== 'awaiting_disbursement' && (
            <form action={cancelApplication}><input type="hidden" name="id" value={a.id} />
              <Submit className="btn-ghost w-full text-red-600" confirm="Cancel this application?">Cancel application</Submit></form>)}
        </div>
      </div>
    </>
  );
}
