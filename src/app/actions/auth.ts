'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fail, num, str, to } from '@/lib/actions';
import { parseSaId, validSaPhone } from '@/lib/sa-id';

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
}

export async function login(fd: FormData) {
  const next = str(fd.get('next')) || '';
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(fd.get('email')), password: str(fd.get('password')) });
  if (error) fail('/login' + (next ? `?next=${encodeURIComponent(next)}` : ''), error.message);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: p } = await supabase.from('profiles').select('role,status').eq('id', user!.id).single();
  if (p?.role === 'admin') redirect(next.startsWith('/admin') ? next : '/admin');
  redirect(next.startsWith('/') && !next.startsWith('/admin') ? next : '/dashboard');
}

export async function register(fd: FormData) {
  const amount = num(fd.get('amount')), months = num(fd.get('months'));
  const carry = amount && months ? `?amount=${amount}&months=${months}` : '';
  const back = '/register' + carry;
  const pw = str(fd.get('password'));
  if (pw.length < 8) fail(back, 'Password must be at least 8 characters');
  if (pw !== str(fd.get('confirm'))) fail(back, 'Passwords do not match');
  const phone = str(fd.get('phone'));
  if (!validSaPhone(phone)) fail(back, 'Enter a valid South African mobile number, e.g. 082 123 4567');
  const sa = parseSaId(str(fd.get('id_number')));
  if (!sa.ok) fail(back, sa.error);
  if (sa.ok && sa.age < 18) fail(back, 'You must be 18 or older to apply for credit');
  if (!fd.get('terms')) fail(back, 'Please accept the terms to continue');
  const dest = '/apply' + (carry ? `${carry}&step=details` : '');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: str(fd.get('email')), password: pw,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(dest)}`,
      data: { full_name: str(fd.get('full_name')), phone, id_number: sa.ok ? sa.id : '' },
    },
  });
  if (error) fail(back, error.message);
  if (data.session) redirect(dest);
  redirect(`/login?next=${encodeURIComponent(dest)}&ok=${encodeURIComponent('Account created. Confirm your email, then sign in to continue your application.')}`);
}

export async function forgot(fd: FormData) {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(str(fd.get('email')), { redirectTo: `${await origin()}/auth/callback?next=/reset-password` });
  to('/forgot-password?sent=1');
}

export async function resetPassword(fd: FormData) {
  const pw = str(fd.get('password'));
  if (pw.length < 8) fail('/reset-password', 'Password must be at least 8 characters');
  if (pw !== str(fd.get('confirm'))) fail('/reset-password', 'Passwords do not match');
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) fail('/reset-password', error.message);
  to('/dashboard', 'Password updated');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete('impersonate');
  redirect('/');
}
