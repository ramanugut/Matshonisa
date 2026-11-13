import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Badge, Card, Empty, Flash, PageHeader, Tabs } from '@/components/ui';
import { Submit } from '@/components/submit';
import { reviewDocument } from '@/app/actions/admin';
import { DT, label } from '@/lib/format';

export const metadata = { title: 'Document verification' };
export default async function Docs({ searchParams }: { searchParams: Promise<{ s?: string; ok?: string; err?: string }> }) {
  const { s = 'pending', ok, err } = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase.from('documents').select('*, profiles(id,full_name)').order('created_at', { ascending: false }).limit(100);
  if (s !== 'all') q = q.eq('status', s);
  const { data } = await q;
  const docs = await Promise.all((data ?? []).map(async (d) => ({ ...d, url: (await supabase.storage.from('documents').createSignedUrl(d.path, 600)).data?.signedUrl })));
  return (
    <>
      <PageHeader title="Document verification" sub="Open each file, confirm it matches the customer, then verify or reject with a reason." />
      <Flash ok={ok} err={err} />
      <Tabs current={s} items={[['pending', 'To verify'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, l]) => ({ key: k, label: l, href: `?s=${k}` }))} />
      {docs.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((d) => { const p = d.profiles as unknown as { id: string; full_name: string }; return (
            <Card key={d.id} title={label(d.kind)} actions={<Badge status={d.status} />}>
              <div className="text-sm"><Link href={`/admin/customers/${p.id}`} className="font-semibold text-navy">{p.full_name}</Link><div className="text-xs text-slate-500">Uploaded {DT(d.created_at)}</div></div>
              <a href={d.url} target="_blank" rel="noreferrer" className="btn-ghost mt-3 w-full">Open {d.file_name}</a>
              {d.status === 'pending' ? (
                <form className="mt-3 space-y-2"><input type="hidden" name="id" value={d.id} /><input name="note" placeholder="Note / rejection reason" className="input" />
                  <div className="grid grid-cols-2 gap-2"><button formAction={verify} className="btn-primary">Verify</button><button formAction={reject} className="btn-danger">Reject</button></div></form>
              ) : d.note ? <p className="mt-3 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">{d.note}</p> : null}
            </Card>); })}
        </div>) : <Empty title="Nothing to verify" sub="New uploads will appear here." />}
    </>
  );
}
async function verify(fd: FormData) { 'use server'; fd.set('status', 'verified'); return reviewDocument(fd); }
async function reject(fd: FormData) { 'use server'; fd.set('status', 'rejected'); return reviewDocument(fd); }
