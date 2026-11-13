import { requireAdmin } from '@/lib/session';
import { Badge, Card, Empty, Flash, PageHeader, Table, Tabs, Td } from '@/components/ui';
import { Submit } from '@/components/submit';
import { failDisbursement, markDisbursed } from '@/app/actions/admin';
import { DT, R } from '@/lib/format';

export const metadata = { title: 'Loan disbursements' };
export default async function Disbursements({ searchParams }: { searchParams: Promise<{ s?: string; ok?: string; err?: string }> }) {
  const { s = 'queued', ok, err } = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase.from('disbursements').select('*, loans(ref), profiles(full_name,bank_name,account_number,account_type)').order('created_at', { ascending: false }).limit(200);
  if (s !== 'all') q = q.eq('status', s);
  const { data } = await q;
  return (
    <>
      <PageHeader title="Loan disbursements" sub="Pay the customer from your bank, then mark the payout as paid. This starts the repayment schedule." />
      <Flash ok={ok} err={err} />
      <Tabs current={s} items={[['queued', 'To pay'], ['paid', 'Paid'], ['failed', 'Failed'], ['all', 'All']].map(([k, l]) => ({ key: k, label: l, href: `?s=${k}` }))} />
      {data?.length ? (
        <div className="space-y-4">
          {data.map((d) => { const p = d.profiles as unknown as { full_name: string; bank_name: string; account_number: string; account_type: string }; return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><div className="text-xs text-slate-500">{(d.loans as unknown as { ref: string } | null)?.ref} · queued {DT(d.created_at)}</div><div className="text-lg font-bold">{p.full_name}</div>
                  <div className="text-sm text-slate-600">{p.bank_name} · {p.account_type} · acc <span className="font-mono">{p.account_number}</span></div></div>
                <div className="text-right"><div className="text-2xl font-extrabold text-navy-900">{R(d.amount)}</div><Badge status={d.status} /></div>
              </div>
              {d.status === 'queued' && (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                  <form action={markDisbursed} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={d.id} />
                    <div><label className="label">Bank reference (optional)</label><input name="reference" className="input w-56" placeholder="e.g. EFT ref" /></div>
                    <Submit className="btn-primary" confirm={`Confirm you have paid ${R(d.amount)} to ${p.full_name}?`}>Mark as paid</Submit></form>
                  <form action={failDisbursement}><input type="hidden" name="id" value={d.id} /><Submit className="btn-ghost text-red-600" confirm="Mark this payout as failed?">Mark failed</Submit></form>
                </div>)}
              {d.reference && <div className="mt-3 text-xs text-slate-500">Ref {d.reference} · paid {DT(d.paid_at)}</div>}
            </Card>); })}
        </div>) : <Empty title="No payouts here" />}
    </>
  );
}
