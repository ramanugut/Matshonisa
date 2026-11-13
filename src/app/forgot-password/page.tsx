import Link from 'next/link';
import { AuthFrame } from '@/components/public';
import { Field } from '@/components/ui';
import { Submit } from '@/components/submit';
import { forgot } from '@/app/actions/auth';

export const metadata = { title: 'Forgot password' };
export default async function Forgot({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const q = await searchParams;
  return (
    <AuthFrame title="Reset your password" sub="We'll email you a secure link to choose a new one." foot={<Link href="/login" className="font-semibold text-brand-600">Back to sign in</Link>}>
      {q.sent ? (
        <div className="rounded-2xl bg-brand-50 p-6 text-center">
          <div className="text-lg font-bold text-brand-700">Check your inbox</div>
          <p className="mt-1 text-sm text-slate-600">If an account exists for that email, a reset link is on its way. The link expires after an hour.</p>
        </div>
      ) : (
        <form action={forgot} className="space-y-4">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Submit className="btn-primary w-full" pending="Sending…">Send reset link</Submit>
        </form>
      )}
    </AuthFrame>
  );
}
