import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Run an RPC from a server action; on failure redirect back with ?err= . */
export async function rpc(name: string, args: Record<string, unknown>, back: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) redirect(`${back}${back.includes('?') ? '&' : '?'}err=${encodeURIComponent(error.message)}`);
  return data;
}
export const to = (path: string, ok?: string) => redirect(ok ? `${path}${path.includes('?') ? '&' : '?'}ok=${encodeURIComponent(ok)}` : path);
export const fail = (path: string, msg: string) => redirect(`${path}${path.includes('?') ? '&' : '?'}err=${encodeURIComponent(msg)}`);
export const num = (v: FormDataEntryValue | null) => Number(String(v ?? '').replace(/[^0-9.]/g, ''));
export const str = (v: FormDataEntryValue | null) => String(v ?? '').trim();
