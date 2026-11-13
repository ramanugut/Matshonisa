import Link from 'next/link';
import { AuthFrame } from '@/components/public';
import { Field, Flash } from '@/components/ui';
import { Submit } from '@/components/submit';
import { login } from '@/app/actions/auth';

export const metadata = { title: 'Sign in' };
export default async function Login({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; next?: string }> }) {
  const q = await searchParams;
  return (
    <AuthFrame title="Welcome back" sub="Sign in to manage your loan." foot={<>New to Machonisa? <Link href="/register" className="font-semibold text-brand-600">Create an account</Link></>}>
      <Flash ok={q.ok} err={q.err} />
      <form action={login} className="space-y-4">
        <input type="hidden" name="next" value={q.next ?? ''} />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
        <div className="text-right text-sm"><Link href="/forgot-password" className="font-semibold text-navy">Forgot password?</Link></div>
        <Submit className="btn-primary w-full" pending="Signing in…">Sign in</Submit>
      </form>
    </AuthFrame>
  );
}
