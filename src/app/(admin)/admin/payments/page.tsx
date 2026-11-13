import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Badge, Empty, PageHeader, Stat, Table, Tabs, Td } from '@/components/ui';
import { DT, R } from '@/lib/format';

export const metadata = { title: 'Payment transactions' };
const TABS = [['all', 'All'], ['card', 'Card'], ['instant_eft', 'Instant EFT'], ['eft', 'EFT'], ['cash', 'Cash'], ['payment_link', 'Link']];
export default async function Payments({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m = 'all' } = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase.from('payments').select('*, loans(ref), profiles(full_name)').order('created_at', { ascending: false }).limit(300);
  if (m === 'payment_link') q = q.eq('recorded_by', 'payment_link'); else if (m !== 'all') q = q.eq('method', m);
  const { data } = await q;
  const total = (data ?? []).reduce((a, p) => a + Number(p.amount), 0);
  return (
    <>
      <PageHeader title="Payment transactions" />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3"><Stat label="Transactions" value={data?.length ?? 0} /><Stat label="Value shown" value={R(total)} tone="green" /></div>
      <Tabs current={m} items={TABS.map(([k, l]) => ({ key: k, label: l, href: `?m=${k}` }))} />
      {data?.length ? (
        <Table head={['Date', 'Reference', 'Customer', 'Loan', 'Method', 'Source', 'Amount', 'Status']}>
          {data.map((p) => (<tr key={p.id} className="hover:bg-slate-50"><Td>{DT(p.created_at)}</Td><Td><Link href={`/receipt/${p.reference}`} className="font-mono text-xs text-navy">{p.reference}</Link></Td>
            <Td>{(p.profiles as unknown as { full_name: string } | null)?.full_name}</Td><Td>{(p.loans as unknown as { ref: string } | null)?.ref}</Td><Td className="capitalize">{p.method.replace('_', ' ')}</Td><Td className="capitalize">{p.recorded_by?.replace('_', ' ')}</Td><Td className="font-semibold">{R(p.amount)}</Td><Td><Badge status={p.status} /></Td></tr>))}
        </Table>) : <Empty title="No transactions" />}
    </>
  );
}
