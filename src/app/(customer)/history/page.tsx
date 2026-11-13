import Link from 'next/link';
import { requireCustomer } from '@/lib/session';
import { Badge, Empty, PageHeader, Table, Tabs, Td } from '@/components/ui';
import { D, DT, R } from '@/lib/format';

export const metadata = { title: 'History' };
export default async function History({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'payments' } = await searchParams;
  const { supabase, customer: c } = await requireCustomer();
  const [{ data: pays }, { data: loans }, { data: apps }] = await Promise.all([
    supabase.from('payments').select('*, loans(ref)').eq('customer_id', c.id).order('created_at', { ascending: false }),
    supabase.from('loans').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }),
    supabase.from('applications').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Loan & payment history" sub="Everything you’ve applied for, borrowed and paid." />
      <Tabs current={tab} items={[{ key: 'payments', label: `Payments (${pays?.length ?? 0})`, href: '?tab=payments' }, { key: 'loans', label: `Loans (${loans?.length ?? 0})`, href: '?tab=loans' }, { key: 'applications', label: `Applications (${apps?.length ?? 0})`, href: '?tab=applications' }]} />
      {tab === 'payments' && (pays?.length ? (
        <Table head={['Date', 'Reference', 'Loan', 'Method', 'Amount', '']}>
          {pays.map((p) => (<tr key={p.id}><Td>{DT(p.created_at)}</Td><Td className="font-mono text-xs">{p.reference}</Td><Td>{(p.loans as { ref: string } | null)?.ref}</Td><Td className="capitalize">{p.method.replace('_', ' ')}</Td><Td className="font-semibold">{R(p.amount)}</Td><Td><Link href={`/receipt/${p.reference}`} className="font-semibold text-navy">Receipt</Link></Td></tr>))}
        </Table>) : <Empty title="No payments yet" />)}
      {tab === 'loans' && (loans?.length ? (
        <Table head={['Loan', 'Principal', 'Total', 'Repaid', 'Status', '']}>
          {loans.map((l) => (<tr key={l.id}><Td className="font-semibold">{l.ref}</Td><Td>{R(l.principal)}</Td><Td>{R(l.total_repayable)}</Td><Td>{R(l.paid_total)}</Td><Td><Badge status={l.status} /></Td><Td><Link href={`/loans/${l.id}`} className="font-semibold text-navy">Open</Link></Td></tr>))}
        </Table>) : <Empty title="No loans yet" />)}
      {tab === 'applications' && (apps?.length ? (
        <Table head={['Application', 'Date', 'Amount', 'Term', 'Status', '']}>
          {apps.map((a) => (<tr key={a.id}><Td className="font-semibold">{a.ref}</Td><Td>{D(a.created_at)}</Td><Td>{R(a.amount)}</Td><Td>{a.months} mo</Td><Td><Badge status={a.status} /></Td><Td><Link href={`/applications/${a.id}`} className="font-semibold text-navy">Open</Link></Td></tr>))}
        </Table>) : <Empty title="No applications yet" action={<Link href="/apply" className="btn-primary">Apply now</Link>} />)}
    </>
  );
}
