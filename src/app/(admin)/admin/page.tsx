import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import { DT, R, R0, label } from '@/lib/format';

export const metadata = { title: 'Admin dashboard' };
export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  await supabase.rpc('refresh_overdue');
  const [{ data: s }, { data: logs }, { data: overdue }] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('loans').select('id,ref,total_repayable,paid_total,profiles(full_name)').eq('status', 'overdue').limit(5),
  ]);
  const st = (s ?? {}) as Record<string, number>;
  const todo = [
    { n: st.pending_apps, t: 'applications to review', href: '/admin/applications?status=open' },
    { n: st.queued_disb, t: 'payouts to send', href: '/admin/disbursements' },
    { n: st.pending_docs, t: 'documents to verify', href: '/admin/documents' },
    { n: st.overdue_loans, t: 'overdue loans', href: '/admin/loans?status=overdue' },
  ];
  return (
    <>
      <PageHeader title="Dashboard" sub="Your lending book at a glance." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Book outstanding" value={R0(st.book_outstanding)} />
        <Stat label="Collected this month" value={R0(st.collected_month)} tone="green" />
        <Stat label="Active loans" value={st.active_loans ?? 0} sub={`${st.overdue_loans ?? 0} overdue`} />
        <Stat label="Customers" value={st.customers ?? 0} />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {todo.map((t) => (
          <Link key={t.t} href={t.href} className={`card p-5 transition hover:-translate-y-0.5 ${t.n ? 'ring-2 ring-brand/40' : ''}`}>
            <div className="text-3xl font-extrabold text-navy-900">{t.n ?? 0}</div><div className="text-sm text-slate-500">{t.t}</div>
          </Link>))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Overdue loans" actions={<Link href="/admin/loans?status=overdue" className="text-sm font-semibold text-brand-600">View all</Link>}>
          {overdue?.length ? overdue.map((l) => (
            <Link key={l.id} href={`/admin/loans/${l.id}`} className="flex justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 hover:bg-slate-50">
              <span><b>{l.ref}</b> · {(l.profiles as unknown as { full_name: string } | null)?.full_name}</span><span className="font-semibold text-red-600">{R(Number(l.total_repayable) - Number(l.paid_total))}</span></Link>)) : <Empty title="Nothing overdue" sub="Great — all loans are up to date." />}
        </Card>
        <Card title="Recent activity" actions={<Link href="/admin/settings?tab=audit" className="text-sm font-semibold text-brand-600">Audit log</Link>}>
          {logs?.length ? logs.map((l) => (
            <div key={l.id} className="border-b border-slate-100 py-2 text-sm last:border-0"><b>{label(l.action.replace('.', ' · '))}</b><div className="text-xs text-slate-500">{l.actor_name} · {DT(l.created_at)}</div></div>)) : <Empty title="No activity yet" />}
        </Card>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Total disbursed" value={R0(st.disbursed_total)} /><Stat label="Total collected" value={R0(st.collected_total)} tone="green" />
      </div>
    </>
  );
}
