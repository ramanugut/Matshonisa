import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Badge, Empty, PageHeader, Table, Td } from '@/components/ui';
import { D, R0 } from '@/lib/format';

export const metadata = { title: 'Customers' };
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }).limit(300);
  const term = q.replace(/[%,()]/g, '').trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,id_number.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data } = await query;
  return (
    <>
      <PageHeader title="Customers" sub={`${data?.length ?? 0} shown`} />
      <form className="mb-5 flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder="Search name, email, ID or phone" className="input" /><button className="btn-navy">Search</button></form>
      {data?.length ? (
        <Table head={['Customer', 'Contact', 'ID number', 'Income', 'Status', 'Joined', '']}>
          {data.map((c) => (<tr key={c.id} className="hover:bg-slate-50"><Td className="font-semibold">{c.full_name || '—'}</Td><Td><div>{c.email}</div><div className="text-xs text-slate-500">{c.phone}</div></Td><Td className="font-mono text-xs">{c.id_number}</Td><Td>{c.monthly_income ? R0(c.monthly_income) : '—'}</Td><Td><Badge status={c.status} /></Td><Td>{D(c.created_at)}</Td><Td><Link href={`/admin/customers/${c.id}`} className="font-semibold text-navy">Open</Link></Td></tr>))}
        </Table>) : <Empty title="No customers found" />}
    </>
  );
}
