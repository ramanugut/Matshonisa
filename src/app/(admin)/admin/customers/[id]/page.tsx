import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { Badge, Card, Flash, PageHeader, Row } from '@/components/ui';
import { Submit } from '@/components/submit';
import { setCustomerStatus, startImpersonating } from '@/app/actions/admin';
import { D, R, R0 } from '@/lib/format';

export const metadata = { title: 'Customer profile' };
export default async function Customer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase.from('profiles').select('*').eq('id', id).eq('role', 'customer').single();
  if (!c) notFound();
  const [{ data: loans }, { data: apps }, { data: docs }, { data: pays }] = await Promise.all([
    supabase.from('loans').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('applications').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('documents').select('*').eq('customer_id', id),
    supabase.from('payments').select('amount').eq('customer_id', id),
  ]);
  const next = c.status === 'active' ? 'suspended' : 'active';
  return (
    <>
      <PageHeader title={c.full_name || 'Customer'} sub={`Joined ${D(c.created_at)}`} actions={<>
        <Badge status={c.status} />
        <form action={startImpersonating}><input type="hidden" name="id" value={c.id} /><button className="btn-navy">View as customer</button></form>
        <form action={setCustomerStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={next} /><Submit className={next === 'suspended' ? 'btn-ghost text-red-600' : 'btn-primary'} confirm={`${next === 'suspended' ? 'Suspend' : 'Reactivate'} this customer?`}>{next === 'suspended' ? 'Suspend' : 'Reactivate'}</Submit></form></>} />
      <Flash ok={q.ok} err={q.err} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Personal"><Row k="Email" v={c.email} /><Row k="Phone" v={c.phone ?? '—'} /><Row k="ID number" v={c.id_number ?? '—'} /><Row k="Date of birth" v={D(c.date_of_birth)} /><Row k="Address" v={c.address ?? '—'} /></Card>
        <Card title="Income & bank"><Row k="Employer" v={c.employer ?? '—'} /><Row k="Monthly income" v={c.monthly_income ? R0(c.monthly_income) : '—'} /><Row k="Bank" v={c.bank_name ?? '—'} /><Row k="Account" v={c.account_number ? `${c.account_type ?? ''} ••${c.account_number.slice(-4)}` : '—'} /></Card>
        <Card title="Summary"><Row k="Loans" v={loans?.length ?? 0} /><Row k="Total borrowed" v={R0(loans?.reduce((a, l) => a + Number(l.principal), 0))} /><Row k="Total paid" v={R(pays?.reduce((a, p) => a + Number(p.amount), 0))} /><Row k="Documents verified" v={`${(docs ?? []).filter((d) => d.status === 'verified').length}/${docs?.length ?? 0}`} /></Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Loans">{loans?.length ? loans.map((l) => (<Link key={l.id} href={`/admin/loans/${l.id}`} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 hover:bg-slate-50"><span><b>{l.ref}</b> · {R0(l.principal)}</span><Badge status={l.status} /></Link>)) : <p className="text-sm text-slate-500">No loans.</p>}</Card>
        <Card title="Applications">{apps?.length ? apps.map((a) => (<Link key={a.id} href={`/admin/applications/${a.id}`} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 hover:bg-slate-50"><span><b>{a.ref}</b> · {R0(a.amount)} · score {a.credit_score}</span><Badge status={a.status} /></Link>)) : <p className="text-sm text-slate-500">No applications.</p>}</Card>
      </div>
    </>
  );
}
