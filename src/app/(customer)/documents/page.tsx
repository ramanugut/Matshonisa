import { requireCustomer } from '@/lib/session';
import { Badge, Card, Flash, PageHeader } from '@/components/ui';
import { Submit } from '@/components/submit';
import { deleteDocument, uploadDocument } from '@/app/actions/customer';
import { D, label } from '@/lib/format';

export const metadata = { title: 'My documents' };
const KINDS: [string, string, string][] = [
  ['id_document', 'ID document', 'Clear copy of your ID card or book'],
  ['proof_of_address', 'Proof of address', 'Utility bill or statement, not older than 3 months'],
  ['payslip', 'Latest payslip', 'Your most recent payslip'],
  ['bank_statement', 'Bank statements', 'Last 3 months, all pages'],
];
export default async function Documents({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const q = await searchParams;
  const { supabase, customer: c, impersonating } = await requireCustomer();
  const { data: docs } = await supabase.from('documents').select('*').eq('customer_id', c.id).order('created_at', { ascending: false });
  const signed = await Promise.all((docs ?? []).map(async (d) => ({ ...d, url: (await supabase.storage.from('documents').createSignedUrl(d.path, 600)).data?.signedUrl })));
  return (
    <>
      <PageHeader title="My documents" sub="Upload clear PDF, JPG or PNG files (max 4 MB each). We verify them to speed up approvals." />
      <Flash ok={q.ok} err={q.err} />
      <div className="grid gap-5 md:grid-cols-2">
        {KINDS.map(([k, t, hint]) => {
          const mine = signed.filter((d) => d.kind === k);
          const best = mine.find((d) => d.status === 'verified') ?? mine[0];
          return (
            <Card key={k} title={t} actions={best ? <Badge status={best.status} /> : <Badge status="pending">Missing</Badge>}>
              <p className="mb-3 text-sm text-slate-500">{hint}</p>
              {mine.map((d) => (
                <div key={d.id} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <div className="min-w-0"><a href={d.url} target="_blank" rel="noreferrer" className="block truncate font-semibold text-navy">{d.file_name}</a>
                    <span className="text-xs text-slate-500">{D(d.created_at)} · {label(d.status)}{d.note ? ` — ${d.note}` : ''}</span></div>
                  {d.status !== 'verified' && !impersonating && <form action={deleteDocument}><input type="hidden" name="id" value={d.id} /><Submit className="text-xs font-semibold text-red-600" pending="…" confirm="Remove this file?">Remove</Submit></form>}
                </div>))}
              {!impersonating && (
                <form action={uploadDocument} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="kind" value={k} />
                  <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy" />
                  <Submit className="btn-navy" pending="Uploading…">Upload</Submit>
                </form>)}
            </Card>);
        })}
      </div>
    </>
  );
}
