'use server';
import { createClient } from '@/lib/supabase/server';
import { fail, num, str, to } from '@/lib/actions';

export async function payByToken(fd: FormData) {
  const token = str(fd.get('token'));
  const mode = str(fd.get('mode'));
  const amount = mode === 'custom' ? num(fd.get('custom')) : num(fd.get(mode));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('pay_with_token', { p_token: token, p_amount: amount, p_method: str(fd.get('method')) || 'card' });
  if (error) fail(`/pay/${token}`, error.message);
  to(`/receipt/${(data as { reference: string }).reference}`);
}
