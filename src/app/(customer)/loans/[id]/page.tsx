import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/session';
import { Badge, Card, Flash, PageHeader, Progress, Row, Stat, Table, Td } from '@/components/ui';
import { D, DT, R } from '@/lib/format';

export const metadata = { title: 'Loan details' };
export default async function LoanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, customer: c } = await requireCustomer();
  const { data: l } = await supabase.from('loans').select('*').eq('id', id).eq('customer_id', c.id).single();
  if (!l) notFound();
  const [{ data: inst }, { data: pays }, { data: disb }] = await Promise.all([
    supabase.from('installments').select('*').eq('loan_id', l.id).order('no'),
    supabase.from('payments').select('*').eq('loan_id', l.id).order('created_at', { ascending: false }),
    supabase.from('disbursements').select('*').eq('loan_id', l.id).maybeSingle(),
  ]);
  const outstanding = Number(l.total_repayable) - Number(l.paid_total);
  return (
    <>
      <PageHeader title={`Loan ${l.ref}`} sub={l.disbursed_at ? `Paid out ${D(l.disbursed_at)}` : 'Not yet paid out'} actions={<>
        <Badge status={l.status} />
        {['active', 'overdue'].includes(l.status) && <Link href={`/loans/${l.id}/pay`} className="btn-primary">Make a payment</Link>}
        {l.status === 'awaiting_acceptance' && <Link href={`/loans/${l.id}/agreement`} className="btn-primary">Review & accept</Link>}</>} />
      <Flash ok={q.ok} err={q.err} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Outstanding" value={R(outstanding)} tone={l.status === 'overdue' ? 'red' : 'navy'} />
        <Stat label="Repaid" value={R(l.paid_total)} tone="green" />
        <Stat label="Monthly" value={R(l.monthly_instalment)} />
        <Stat label="Term" value={`${l.months} mo`} />
      </div>
      <Card className="mb-6"><Progress value={(Number(l.paid_total) / Number(l.total_repayable)) * 100} /></Card>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-3 text-lg font-bold">Repayment schedule</h2>
          <Table head={['#', 'Due', 'Amount', 'Paid', 'Status']} empty={!inst?.length && <p className="p-6 text-center text-sm text-slate-500">Your schedule appears once the loan is paid out.</p>}>
            {inst?.map((i) => (
              <tr key={i.id}><Td>{i.no}</Td><Td>{D(i.due_date)}</Td><Td>{R(i.amount)}</Td><Td>{R(i.paid_amount)}</Td>
                <Td><Badge status={i.status === 'due' && new Date(i.due_date) < new Date() ? 'overdue' : i.status} /></Td></tr>))}
          </Table>
        </div>
        <div className="space-y-6">
          <Card title="Cost breakdown">
            <Row k="Loan amount" v={R(l.principal)} /><Row k="Interest" v={R(l.interest)} /><Row k="Service fees" v={R(l.service_fees)} /><Row k="Initiation fee" v={R(l.initiation_fee)} /><Row k="Total repayable" v={R(l.total_repayable)} />
          </Card>
          {disb && <Card title="Payout"><Row k="Amount" v={R(disb.amount)} /><Row k="Status" v={<Badge status={disb.status} />} />{disb.paid_at && <Row k="Paid" v={DT(disb.paid_at)} />}{disb.reference && <Row k="Reference" v={disb.reference} />}</Card>}
          <Card title="Payments">
            {pays?.length ? pays.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0">
                <div><div className="font-semibold">{R(p.amount)}</div><div className="text-xs text-slate-500">{DT(p.created_at)}</div></div>
                <Link href={`/receipt/${p.reference}`} className="text-xs font-semibold text-navy">Receipt</Link></div>)) : <p className="text-sm text-slate-500">No payments yet.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
