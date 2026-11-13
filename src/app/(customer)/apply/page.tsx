import Link from 'next/link';
import { requireCustomer } from '@/lib/session';
import { Badge, Card, Empty, Field, Flash, PageHeader, Row, Select } from '@/components/ui';
import { Stepper } from '@/components/stepper';
import { Submit } from '@/components/submit';
import { LoanStep, PURPOSES } from './loan-step';
import { loadRules, quote } from '@/lib/quote';
import { parseSaId } from '@/lib/sa-id';
import { applyForLoan, deleteDocument, saveProfile, uploadDocument } from '@/app/actions/customer';
import { D, R, R0 } from '@/lib/format';

export const metadata = { title: 'Apply for a loan' };
const BANKS = ['', 'ABSA', 'Capitec', 'FNB', 'Nedbank', 'Standard Bank', 'TymeBank', 'African Bank', 'Discovery Bank', 'Investec', 'Other'];
const DOCS: [string, string, string][] = [
  ['id_document', 'ID document', 'Clear copy of your ID card or smart ID (front and back)'],
  ['proof_of_address', 'Proof of address', 'Utility bill or statement not older than 3 months'],
  ['payslip', 'Latest payslip', 'Your most recent payslip'],
  ['bank_statement', 'Bank statements', 'Last 3 months, all pages, in your name'],
];
type Q = { amount?: string; months?: string; purpose?: string; step?: string; ok?: string; err?: string };

export default async function Apply({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const { supabase, customer: c, impersonating } = await requireCustomer();
  const { rules, fees } = await loadRules(supabase);
  const hasAmount = !!q.amount;
  const amount = Math.min(rules.max_amount, Math.max(rules.min_amount, Number(q.amount) || 3000));
  const months = Math.min(rules.max_months, Math.max(rules.min_months, Number(q.months) || 3));
  const purpose = PURPOSES.includes(q.purpose ?? '') ? (q.purpose as string) : PURPOSES[0];
  const base = `amount=${amount}&months=${months}&purpose=${encodeURIComponent(purpose)}`;
  const url = (step: string) => `/apply?${base}&step=${step}`;

  const [{ data: docs }, { data: openLoans }, { data: openApps }] = await Promise.all([
    supabase.from('documents').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }),
    supabase.from('loans').select('id,ref,status').eq('customer_id', c.id).in('status', ['awaiting_acceptance', 'awaiting_disbursement', 'active', 'overdue']),
    supabase.from('applications').select('id,ref,status').eq('customer_id', c.id).in('status', ['pending', 'under_review']),
  ]);
  const detailsDone = !!(c.phone && c.address && c.monthly_income && c.monthly_expenses !== null && c.bank_name && c.account_number);
  const have = new Set((docs ?? []).map((d) => d.kind));
  const docsDone = DOCS.every(([k]) => have.has(k));
  let step = q.step ?? (hasAmount ? (detailsDone ? (docsDone ? 'review' : 'documents') : 'details') : 'loan');
  if (step === 'documents' && !detailsDone) step = 'details';
  if (step === 'review' && !(detailsDone && docsDone)) step = detailsDone ? 'documents' : 'details';

  const steps = [{ key: 'loan', label: 'Your loan', href: `/apply?${base}&step=loan` }, { key: 'details', label: 'About you', href: url('details') }, { key: 'documents', label: 'Documents', href: url('documents') }, { key: 'review', label: 'Review' }];
  const sa = parseSaId(c.id_number ?? '');

  if (openLoans?.length || openApps?.length) {
    const l = openLoans?.[0], a = openApps?.[0];
    return (
      <>
        <PageHeader title="Apply for a loan" />
        <Empty title="You already have a loan or application in progress" sub="You can apply again once your current loan is fully repaid or your application has been decided."
          action={<Link className="btn-navy" href={l ? `/loans/${l.id}` : `/applications/${a!.id}`}>View {l?.ref ?? a?.ref}</Link>} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Apply for a loan" sub="Four short steps. You’ll see the full cost before anything is final." />
      <Stepper steps={steps} current={step} />
      <Flash ok={q.ok} err={q.err} />

      {step === 'loan' && <LoanStep rules={rules} fees={fees} initial={{ amount, months }} purpose={purpose} />}

      {step === 'details' && (
        <form action={saveProfile} className="grid gap-6 lg:grid-cols-2">
          <input type="hidden" name="back" value={url('details')} /><input type="hidden" name="next" value={url('documents')} />
          <div className="space-y-6">
            <Card title="Personal details"><div className="space-y-4">
              <Field label="Full name" name="full_name" defaultValue={c.full_name} required />
              <div><label className="label">ID number</label><input className="input bg-slate-50" value={c.id_number ?? ''} readOnly />
                {sa.ok && <p className="mt-1 text-xs text-slate-500">From your ID: born {D(sa.dob)} · {sa.age} years · {sa.gender}</p>}</div>
              <Field label="Mobile number" name="phone" type="tel" defaultValue={c.phone} required placeholder="082 123 4567" />
              <div><label className="label" htmlFor="address">Residential address *</label><textarea id="address" name="address" rows={3} required defaultValue={c.address ?? ''} className="input" placeholder="Street, suburb, city, postal code" /></div>
            </div></Card>
            <Card title="Employment"><Field label="Employer (or ‘Self-employed’ / ‘Unemployed’)" name="employer" defaultValue={c.employer} /></Card>
          </div>
          <div className="space-y-6">
            <Card title="Monthly budget">
              <p className="mb-4 text-sm text-slate-500">The law requires us to check that you can afford this loan. Be honest — it protects you from over-borrowing.</p>
              <div className="space-y-4">
                <Field label="Take-home income per month (R)" name="monthly_income" type="number" step="0.01" min="1" defaultValue={c.monthly_income} required />
                <Field label="Living expenses per month (R)" name="monthly_expenses" type="number" step="0.01" min="0" defaultValue={c.monthly_expenses} required hint="Rent or bond, food, transport, school fees, utilities, airtime" />
                <Field label="Other debt repayments per month (R)" name="monthly_debt" type="number" step="0.01" min="0" defaultValue={c.monthly_debt ?? 0} hint="Loans, credit cards, accounts, vehicle finance. Enter 0 if none." />
              </div>
            </Card>
            <Card title="Bank account for your payout">
              <p className="mb-4 text-sm text-slate-500">The account must be in your own name.</p>
              <div className="space-y-4">
                <Select label="Bank" name="bank_name" options={BANKS} defaultValue={c.bank_name} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Account number" name="account_number" inputMode="numeric" defaultValue={c.account_number} required />
                  <Select label="Account type" name="account_type" options={['Cheque / current', 'Savings', 'Transmission']} defaultValue={c.account_type} />
                </div>
              </div>
            </Card>
            {!impersonating && <Submit className="btn-primary w-full" pending="Saving…">Save & continue</Submit>}
          </div>
        </form>
      )}

      {step === 'documents' && (
        <>
          <p className="mb-4 text-sm text-slate-600">Upload clear PDF, JPG or PNG files (max 4 MB each). You can take a photo with your phone. All four are needed before you can submit.</p>
          <div className="grid gap-5 md:grid-cols-2">
            {DOCS.map(([k, t, hint]) => {
              const mine = (docs ?? []).filter((d) => d.kind === k);
              return (
                <Card key={k} title={t} actions={mine.length ? <Badge status={mine.some((d) => d.status === 'verified') ? 'verified' : mine[0].status}>{mine.some((d) => d.status === 'verified') ? 'Verified' : 'Uploaded'}</Badge> : <Badge status="pending">Required</Badge>}>
                  <p className="mb-3 text-sm text-slate-500">{hint}</p>
                  {mine.map((d) => (
                    <div key={d.id} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate font-semibold">{d.file_name}</span>
                      {d.status !== 'verified' && !impersonating && <form action={deleteDocument}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="back" value={url('documents')} /><Submit className="text-xs font-semibold text-red-600" pending="…">Remove</Submit></form>}
                    </div>))}
                  {!impersonating && !mine.length && (
                    <form action={uploadDocument} className="mt-3 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="kind" value={k} /><input type="hidden" name="back" value={url('documents')} />
                      <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy" />
                      <Submit className="btn-navy" pending="Uploading…">Upload</Submit>
                    </form>)}
                </Card>);
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={url('details')} className="btn-ghost">Back</Link>
            {docsDone ? <Link href={url('review')} className="btn-primary px-6">Continue to review</Link> : <span className="text-sm text-slate-500">Upload all four documents to continue.</span>}
          </div>
        </>
      )}

      {step === 'review' && (() => {
        const qt = quote(amount, months, fees);
        const disposable = Number(c.monthly_income ?? 0) - Number(c.monthly_expenses ?? 0) - Number(c.monthly_debt ?? 0);
        const affordable = qt.monthly <= disposable;
        return (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6">
              <Card title="Your quotation" actions={<Link href={url('loan')} className="text-sm font-semibold text-brand-600">Change</Link>}>
                <Row k="Loan amount" v={R(qt.principal)} /><Row k="Repayment period" v={`${months} ${months === 1 ? 'month' : 'months'}`} /><Row k="Purpose" v={purpose} />
                <Row k="Interest rate" v="5% per month (60% per year)" />
                <Row k="Interest" v={R(qt.interest)} /><Row k={`Monthly service fee (${months} × ${R(fees.service_fee_monthly)})`} v={R(qt.service_fees)} /><Row k="Once-off initiation fee" v={R(qt.initiation_fee)} />
                <Row k="Total cost of credit" v={R(qt.interest + qt.service_fees + qt.initiation_fee)} />
                <Row k="Total you will repay" v={<span className="text-lg">{R(qt.total)}</span>} />
                <Row k="Monthly instalment" v={R(qt.monthly)} />
                <p className="mt-3 text-xs text-slate-500">This quotation is valid for 10 days after your application is approved. The amount you receive is {R0(qt.principal)}; the fees are added to what you repay.</p>
              </Card>
              <Card title="Documents"><ul className="space-y-1.5 text-sm">{DOCS.map(([k, t]) => <li key={k} className="flex justify-between"><span>{t}</span><Badge status={(docs ?? []).some((d) => d.kind === k && d.status === 'verified') ? 'verified' : 'pending'}>{(docs ?? []).some((d) => d.kind === k && d.status === 'verified') ? 'Verified' : 'Uploaded'}</Badge></li>)}</ul>
                <p className="mt-3 text-xs text-slate-500">Our team verifies your documents before your payout is made.</p></Card>
            </div>
            <div className="space-y-6">
              <Card title="Affordability check">
                <Row k="Take-home income" v={R(c.monthly_income)} /><Row k="Living expenses" v={`− ${R(c.monthly_expenses)}`} /><Row k="Other debt repayments" v={`− ${R(c.monthly_debt)}`} />
                <Row k="Left over each month" v={R(disposable)} /><Row k="This loan’s instalment" v={R(qt.monthly)} />
                <div className={`mt-3 rounded-xl p-3 text-sm ${affordable ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-900'}`}>
                  {affordable ? 'Looks affordable based on what you told us.' : <>The instalment is more than you have left each month, so this application would likely be declined. <Link href={url('loan')} className="font-bold underline">Try a smaller amount or longer term</Link>.</>}
                </div>
                <p className="mt-3 text-xs text-slate-500">Need to correct your figures? <Link href={url('details')} className="font-semibold text-navy underline">Edit your details</Link>.</p>
              </Card>
              <form action={applyForLoan} className="card p-5">
                <input type="hidden" name="amount" value={amount} /><input type="hidden" name="months" value={months} /><input type="hidden" name="purpose" value={purpose} /><input type="hidden" name="back" value={url('review')} />
                <label className="flex items-start gap-2.5 text-sm text-slate-600">
                  <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-brand" required />
                  <span>I confirm the information I gave is true and complete. I consent to Machonisa doing a credit and affordability assessment and checking my details with credit bureaus. I understand this is a quotation, not yet a credit agreement.</span>
                </label>
                <Submit className="btn-primary mt-4 w-full" pending="Assessing…" disabled={impersonating}>Submit application</Submit>
              </form>
            </div>
          </div>
        );
      })()}
    </>
  );
}
