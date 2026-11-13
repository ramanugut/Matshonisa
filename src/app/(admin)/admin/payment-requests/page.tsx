import { requireAdmin } from '@/lib/session';
import { Badge, Card, Empty, Field, Flash, PageHeader, Select, Table, Tabs, Td } from '@/components/ui';
import { Submit } from '@/components/submit';
import { CopyButton } from '@/components/copy-button';
import { cancelPaymentRequest, createPaymentRequest, runReminders } from '@/app/actions/admin';
import { D, R, site } from '@/lib/format';

export const metadata = { title: 'Payment requests' };
export default async function PaymentRequests({ searchParams }: { searchParams: Promise<{ kind?: string; ok?: string; err?: string; link?: string }> }) {
  const { kind = 'all', ok, err, link } = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase.from('payment_requests').select('*, loans(ref), profiles(full_name)').order('created_at', { ascending: false }).limit(200);
  if (kind !== 'all') q = q.eq('kind', kind);
  const [{ data }, { data: loans }] = await Promise.all([q, supabase.from('loans').select('id,ref,monthly_instalment,profiles(full_name)').in('status', ['active', 'overdue'])]);
  const url = link ? `${site()}/pay/${link}` : '';
  return (
    <>
      <PageHeader title="Payment requests" sub="Manual requests you create, and automatic reminders generated before each due date."
        actions={<form action={runReminders}><Submit className="btn-ghost">Generate due reminders now</Submit></form>} />
      <Flash ok={ok} err={err} />
      {url && <div className="mb-5 rounded-2xl border border-brand/30 bg-brand-50 p-4"><div className="text-sm font-bold text-brand-700">Payment link ready</div><div className="mt-1 break-all rounded-lg bg-white p-2 font-mono text-xs">{url}</div><div className="mt-3"><CopyButton text={url} /></div></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Tabs current={kind} items={[{ key: 'all', label: 'All', href: '?kind=all' }, { key: 'manual', label: 'Manual', href: '?kind=manual' }, { key: 'automatic', label: 'Automatic', href: '?kind=automatic' }]} />
          {data?.length ? (
            <Table head={['Customer', 'Loan', 'Type', 'Amount', 'Due', 'Status', '']}>
              {data.map((r) => (<tr key={r.id} className="hover:bg-slate-50"><Td className="font-semibold">{(r.profiles as unknown as { full_name: string } | null)?.full_name}</Td><Td>{(r.loans as unknown as { ref: string } | null)?.ref}</Td><Td className="capitalize">{r.kind}</Td><Td>{R(r.amount)}</Td><Td>{D(r.due_date)}</Td><Td><Badge status={r.status} /></Td>
                <Td>{r.status === 'open' && <div className="flex items-center gap-2"><CopyButton text={`${site()}/pay/${r.token}`} label="Copy" />
                  <form action={cancelPaymentRequest}><input type="hidden" name="id" value={r.id} /><Submit className="text-xs font-semibold text-red-600" pending="…" confirm="Cancel this request?">Cancel</Submit></form></div>}</Td></tr>))}
            </Table>) : <Empty title="No payment requests" sub="Create one on the right, or generate reminders for upcoming instalments." />}
        </div>
        <Card title="New payment request">
          {loans?.length ? (
            <form action={createPaymentRequest} className="space-y-3"><input type="hidden" name="back" value="/admin/payment-requests" />
              <Select label="Loan" name="loan" options={loans.map((l) => ({ value: l.id, label: `${l.ref} · ${(l.profiles as unknown as { full_name: string } | null)?.full_name}` }))} />
              <Field label="Amount (R)" name="amount" type="number" step="0.01" min="0.01" required /><Field label="Note" name="note" placeholder="Optional" />
              <Submit className="btn-primary w-full">Create link</Submit></form>) : <p className="text-sm text-slate-500">No active loans to request payment for.</p>}
        </Card>
      </div>
    </>
  );
}
