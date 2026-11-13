import Link from 'next/link';
import { AuthFrame } from '@/components/public';
import { Field, Flash } from '@/components/ui';
import { Submit } from '@/components/submit';
import { register } from '@/app/actions/auth';
import { R0 } from '@/lib/format';

export const metadata = { title: 'Create account' };
export default async function Register({ searchParams }: { searchParams: Promise<{ err?: string; amount?: string; months?: string }> }) {
  const q = await searchParams;
  const amount = Number(q.amount) || 0, months = Number(q.months) || 0;
  const has = amount > 0 && months > 0;
  return (
    <AuthFrame title="Create your account" sub={has ? 'One quick step before we continue your application.' : 'Takes about two minutes.'} foot={<>Already registered? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link></>}>
      {has && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-brand-50 p-3.5 text-sm text-brand-700">
          <span>Applying for <b>{R0(amount)}</b> over <b>{months} {months === 1 ? 'month' : 'months'}</b></span>
          <Link href={`/start?amount=${amount}&months=${months}`} className="font-semibold underline">Change</Link>
        </div>
      )}
      <Flash err={q.err} />
      <form action={register} className="space-y-4">
        {has && <><input type="hidden" name="amount" value={amount} /><input type="hidden" name="months" value={months} /></>}
        <Field label="Full name (as on your ID)" name="full_name" required autoComplete="name" />
        <Field label="ID number" name="id_number" required inputMode="numeric" maxLength={13} placeholder="13 digits" hint="We read your date of birth from your ID, so there’s no need to type it." />
        <Field label="Mobile number" name="phone" type="tel" required autoComplete="tel" placeholder="082 123 4567" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" name="password" type="password" required autoComplete="new-password" hint="At least 8 characters" />
          <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" name="terms" className="mt-1 h-4 w-4 accent-brand" />
          <span>I am 18 or older and I agree to Machonisa processing my personal information (POPIA) to assess and administer my application.</span>
        </label>
        <Submit className="btn-primary w-full" pending="Creating account…">Create account & continue</Submit>
      </form>
    </AuthFrame>
  );
}
