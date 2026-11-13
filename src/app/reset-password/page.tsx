import { redirect } from 'next/navigation';
import { AuthFrame } from '@/components/public';
import { Field, Flash } from '@/components/ui';
import { Submit } from '@/components/submit';
import { resetPassword } from '@/app/actions/auth';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Choose a new password' };
export default async function Reset({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { user } = await getSession();
  if (!user) redirect('/forgot-password');
  const q = await searchParams;
  return (
    <AuthFrame title="Choose a new password" sub="Use at least 8 characters.">
      <Flash err={q.err} />
      <form action={resetPassword} className="space-y-4">
        <Field label="New password" name="password" type="password" required autoComplete="new-password" />
        <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
        <Submit className="btn-primary w-full">Update password</Submit>
      </form>
    </AuthFrame>
  );
}
