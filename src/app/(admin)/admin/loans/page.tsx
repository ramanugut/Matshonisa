import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Badge, Empty, PageHeader, Table, Tabs, Td } from '@/components/ui';
import { D, R } from '@/lib/format';

export const metadata = { title: 'All loans' };
const TABS = [['all', 'All'], ['active', 'Active'], ['overdue', 'Overdue'], ['awaiting_acceptance', 'Awaiting acceptance'], ['awaiting_disbursement', 'Awaiting payout'], ['paid', 'Paid'], ['written_off', 'Written off']];
export default async function Loans({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'all' } = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase.from('loans').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(300);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return (
    <>
      <PageHeader title="All loans" />
      <Tabs current={status} items={TABS.map(([k, l]) => ({ key: k, label: l, href: `?status=${k}` }))} />
      {data?.length ? (
        <Table head={['Loan', 'Customer', 'Principal', 'Total', 'Outstanding', 'Status', 'Paid out', '']}>
          {data.map((l) => (<tr key={l.id} className="hover:bg-slate-50"><Td className="font-semibold">{l.ref}</Td><Td>{(l.profiles as unknown as { full_name: string } | null)?.full_name}</Td><Td>{R(l.principal)}</Td><Td>{R(l.total_repayable)}</Td>
            <Td className="font-semibold">{R(Number(l.total_repayable) - Number(l.paid_total))}</Td><Td><Badge status={l.status} /></Td><Td>{D(l.disbursed_at)}</Td><Td><Link href={`/admin/loans/${l.id}`} className="font-semibold text-navy">Manage</Link></Td></tr>))}
        </Table>) : <Empty title="No loans" sub="Loans appear after an application is approved." />}
    </>
  );
}
