import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { Badge, Card, Field, Flash, PageHeader, Row, Select, Stat, Table, Td } from '@/components/ui';
import { Submit } from '@/components/submit';
import { CopyButton } from '@/components/copy-button';
import { createPaymentRequest, recordPayment, writeOffLoan } from '@/app/actions/admin';
import { D, DT, R, site } from '@/lib/format';

export const metadata = { title: 'Loan management' };
export default async function AdminLoan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string; link?: string }> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: l } = await supabase.from('loans').select('*, profiles(id,full_name,phone,email)').eq('id', id).single();
  if (!l) notFound();
  const p = l.profiles as unknown as { id: string; full_name: string; phone: string; email: string };
  const [{ data: inst }, { data: pays }, { data: reqs }] = await Promise.all([
    supabase.from('installments').select('*').eq('loan_id', id).order('no'),
    supabase.from('payments').select('*').eq('loan_id', id).order('created_at', { ascending: false }),
    supabase.from('payment_requests').select('*').eq('loan_id', id).order('created_at', { ascending: false }).limit(5),
  ]);
  const out = Number(l.total_repayable) - Number(l.paid_total);
  const open = ['active', 'overdue'].includes(l.status);
  const url = q.link ? `${site()}/pay/${q.link}` : '';
  return (
    <>
      <PageHeader title={`Loan ${l.ref}`} sub={<>{p.full_name} · <Link href={`/admin/customers/${p.id}`} className="font-semibold text-navy">customer profile</Link></>} actions={<Badge status={l.status} />} />
      <Flash ok={q.ok} err={q.err} />
      {url && (
        <div className="mb-6 rounded-2xl border border-brand/30 bg-brand-50 p-4"><div className="text-sm font-bold text-brand-700">Payment link ready</div>
          <div className="mt-1 break-all rounded-lg bg-white p-2 font-mono text-xs">{url}</div>
          <div className="mt-3 flex flex-wrap gap-2"><CopyButton text={url} />
            <a className="btn-ghost" href={`https://wa.me/${(p.phone ?? '').replace(/\D/g, '').replace(/^0/, '27')}?text=${encodeURIComponent(`Hi ${p.full_name.split(' ')[0]}, here is your secure Machonisa payment link: ${url}`)}`} target="_blank" rel="noreferrer">Send via WhatsApp</a>
            <a className="btn-ghost" href={`mailto:${p.email}?subject=${encodeURIComponent('Your Machonisa payment link')}&body=${encodeURIComponent(`Hi ${p.full_name.split(' ')[0]},\n\nPay securely here: ${url}`)}`}>Send via email</a></div></div>)}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Principal" value={R(l.principal)} /><Stat label="Total repayable" value={R(l.total_repayable)} /><Stat label="Repaid" value={R(l.paid_total)} tone="green" /><Stat label="Outstanding" value={R(out)} tone={l.status === 'overdue' ? 'red' : 'navy'} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div><h2 className="mb-3 text-lg font-bold">Repayment schedule</h2>
            <Table head={['#', 'Due', 'Amount', 'Paid', 'Status']} empty={!inst?.length && <p className="p-6 text-center text-sm text-slate-500">Created when the payout is marked as paid.</p>}>
              {inst?.map((i) => (<tr key={i.id}><Td>{i.no}</Td><Td>{D(i.due_date)}</Td><Td>{R(i.amount)}</Td><Td>{R(i.paid_amount)}</Td><Td><Badge status={i.status === 'due' && new Date(i.due_date) < new Date() ? 'overdue' : i.status} /></Td></tr>))}
            </Table></div>
          <Card title="Payments">{pays?.length ? pays.map((x) => (<div key={x.id} className="flex justify-between border-b border-slate-100 py-2.5 text-sm last:border-0"><span><b>{R(x.amount)}</b> · {x.method} · by {x.recorded_by}</span><span className="text-slate-500">{DT(x.created_at)}</span></div>)) : <p className="text-sm text-slate-500">No payments yet.</p>}</Card>
        </div>
        <div className="space-y-6">
          {open && (<>
            <Card title="Record a payment (EFT / cash)"><form action={recordPayment} className="space-y-3"><input type="hidden" name="loan" value={l.id} />
              <Field label="Amount (R)" name="amount" type="number" step="0.01" min="0.01" max={out} required />
              <Select label="Method" name="method" options={[{ value: 'eft', label: 'EFT' }, { value: 'cash', label: 'Cash' }, { value: 'debit_order', label: 'Debit order' }]} />
              <Submit className="btn-navy w-full" confirm="Record this payment?">Record payment</Submit></form></Card>
            <Card title="Send a payment request"><form action={createPaymentRequest} className="space-y-3"><input type="hidden" name="loan" value={l.id} /><input type="hidden" name="back" value={`/admin/loans/${l.id}`} />
              <Field label="Amount (R)" name="amount" type="number" step="0.01" min="0.01" max={out} defaultValue={Math.min(Number(l.monthly_instalment), out)} required />
              <Field label="Note" name="note" placeholder="Optional message" />
              <Submit className="btn-primary w-full">Create secure link</Submit></form></Card>
          </>)}
          <Card title="Terms"><Row k="Term" v={`${l.months} months`} /><Row k="Interest" v={R(l.interest)} /><Row k="Service fees" v={R(l.service_fees)} /><Row k="Initiation" v={R(l.initiation_fee)} /><Row k="Accepted" v={D(l.accepted_at)} /><Row k="Paid out" v={D(l.disbursed_at)} /></Card>
          {reqs?.length ? <Card title="Recent requests">{reqs.map((r) => <Row key={r.id} k={`${R(r.amount)} · ${r.kind}`} v={<Badge status={r.status} />} />)}</Card> : null}
          {open && <form action={writeOffLoan}><input type="hidden" name="id" value={l.id} /><Submit className="btn-ghost w-full text-red-600" confirm="Write off this loan? This cannot be undone.">Write off loan</Submit></form>}
        </div>
      </div>
    </>
  );
}
