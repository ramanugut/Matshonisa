import { requireCustomer } from '@/lib/session';
import { Card, Field, Flash, PageHeader, Select } from '@/components/ui';
import { Submit } from '@/components/submit';
import { changePassword, saveProfile } from '@/app/actions/customer';
import { parseSaId } from '@/lib/sa-id';
import { D } from '@/lib/format';

export const metadata = { title: 'My profile' };
const BANKS = ['', 'ABSA', 'Capitec', 'FNB', 'Nedbank', 'Standard Bank', 'TymeBank', 'African Bank', 'Discovery Bank', 'Investec', 'Other'];
export default async function Profile({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const q = await searchParams;
  const { customer: c, impersonating } = await requireCustomer();
  const sa = parseSaId(c.id_number ?? '');
  return (
    <>
      <PageHeader title="My profile" sub="Keep your details up to date. Your bank account is where your loan will be paid." />
      <Flash ok={q.ok} err={q.err} />
      <form action={saveProfile} className="grid gap-6 lg:grid-cols-2">
        <Card title="Personal details"><div className="space-y-4">
          <Field label="Full name" name="full_name" defaultValue={c.full_name} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">ID number</label><input className="input bg-slate-50" value={c.id_number ?? ''} readOnly />
              {sa.ok && <p className="mt-1 text-xs text-slate-500">Born {D(sa.dob)} · {sa.age} years (read from your ID)</p>}</div>
          </div>
          <div><label className="label">Email</label><input className="input bg-slate-50" value={c.email ?? ''} readOnly /></div>
          <Field label="Mobile number" name="phone" type="tel" defaultValue={c.phone} required />
          <div><label className="label" htmlFor="address">Residential address *</label><textarea id="address" name="address" rows={3} required defaultValue={c.address ?? ''} className="input" /></div>
        </div></Card>
        <div className="space-y-6">
          <Card title="Employment & income"><div className="space-y-4">
            <Field label="Employer" name="employer" defaultValue={c.employer} />
            <Field label="Take-home income per month (R)" name="monthly_income" type="number" step="0.01" min="1" defaultValue={c.monthly_income} required />
            <Field label="Living expenses per month (R)" name="monthly_expenses" type="number" step="0.01" min="0" defaultValue={c.monthly_expenses} required />
            <Field label="Other debt repayments per month (R)" name="monthly_debt" type="number" step="0.01" min="0" defaultValue={c.monthly_debt ?? 0} />
          </div></Card>
          <Card title="Bank account for payouts"><div className="space-y-4">
            <Select label="Bank" name="bank_name" options={BANKS} defaultValue={c.bank_name} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account number" name="account_number" inputMode="numeric" defaultValue={c.account_number} required />
              <Select label="Account type" name="account_type" options={['', 'Cheque / current', 'Savings', 'Transmission']} defaultValue={c.account_type} />
            </div>
          </div></Card>
          {!impersonating && <Submit className="btn-primary w-full" pending="Saving…">Save profile</Submit>}
        </div>
      </form>
      {!impersonating && (
        <Card title="Change password" className="mt-6 max-w-xl">
          <form action={changePassword} className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" name="password" type="password" required autoComplete="new-password" />
            <Field label="Confirm" name="confirm" type="password" required autoComplete="new-password" />
            <div className="sm:col-span-2"><Submit className="btn-navy" pending="Updating…">Update password</Submit></div>
          </form>
        </Card>)}
    </>
  );
}
