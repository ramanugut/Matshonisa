import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Badge, Empty, PageHeader, Table, Tabs, Td } from '@/components/ui';
import { DT, R } from '@/lib/format';

export const metadata = { title: 'Loan applications' };
const TABS = [['open', 'Needs review'], ['approved', 'Approved'], ['declined', 'Declined'], ['accepted', 'Accepted'], ['all', 'All']];
export default async function Applications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'open' } = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase.from('applications').select('*, profiles(full_name,email)').order('created_at', { ascending: false }).limit(200);
  if (status === 'open') q = q.in('status', ['pending', 'under_review']); else if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return (
    <>
      <PageHeader title="Loan applications" sub="Auto-approved applications appear here too, so you can audit the rules." />
      <Tabs current={status} items={TABS.map(([k, l]) => ({ key: k, label: l, href: `?status=${k}` }))} />
      {data?.length ? (
        <Table head={['Application', 'Customer', 'Amount', 'Term', 'Score', 'Status', 'Date', '']}>
          {data.map((a) => { const p = a.profiles as unknown as { full_name: string } | null; return (
            <tr key={a.id} className="hover:bg-slate-50"><Td className="font-semibold">{a.ref}</Td><Td>{p?.full_name}</Td><Td>{R(a.amount)}</Td><Td>{a.months} mo</Td>
              <Td><span className={`font-bold ${a.credit_score >= 620 ? 'text-brand-600' : a.credit_score < 480 ? 'text-red-600' : 'text-amber-600'}`}>{a.credit_score}</span></Td>
              <Td><Badge status={a.status} /></Td><Td>{DT(a.created_at)}</Td><Td><Link href={`/admin/applications/${a.id}`} className="font-semibold text-navy">Review</Link></Td></tr>); })}
        </Table>) : <Empty title="Nothing here" sub="No applications match this filter." />}
    </>
  );
}
