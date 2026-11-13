'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fail, num, rpc, str, to } from '@/lib/actions';

export async function startImpersonating(fd: FormData) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: me } = await sb.from('profiles').select('role').eq('id', user?.id ?? '').single();
  if (me?.role !== 'admin') redirect('/');
  const id = str(fd.get('id'));
  (await cookies()).set('impersonate', id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 3600 });
  await sb.rpc('log_event', { p_action: 'impersonation.started', p_entity: 'customer', p_entity_id: id, p_meta: {} }).then(() => null, () => null);
  redirect('/dashboard');
}
export async function stopImpersonating() {
  const c = await cookies(); const id = c.get('impersonate')?.value; c.delete('impersonate');
  redirect(id ? `/admin/customers/${id}` : '/admin');
}

export async function decideApplication(fd: FormData) {
  const id = str(fd.get('id')); const back = `/admin/applications/${id}`;
  await rpc('decide_application', { p_app: id, p_decision: str(fd.get('decision')), p_note: str(fd.get('note')) || null }, back);
  revalidatePath('/admin', 'layout');
  to(back, 'Decision recorded');
}
export async function markDisbursed(fd: FormData) {
  await rpc('mark_disbursed', { p_disb: str(fd.get('id')), p_reference: str(fd.get('reference')) || null }, '/admin/disbursements');
  to('/admin/disbursements', 'Payout marked as paid and repayment schedule created');
}
export async function failDisbursement(fd: FormData) {
  await rpc('fail_disbursement', { p_disb: str(fd.get('id')), p_note: str(fd.get('note')) || null }, '/admin/disbursements');
  to('/admin/disbursements', 'Payout marked as failed');
}
export async function recordPayment(fd: FormData) {
  const id = str(fd.get('loan')); const back = `/admin/loans/${id}`;
  await rpc('admin_record_payment', { p_loan: id, p_amount: num(fd.get('amount')), p_method: str(fd.get('method')) || 'eft' }, back);
  to(back, 'Payment recorded');
}
export async function createPaymentRequest(fd: FormData) {
  const loan = str(fd.get('loan')); const back = str(fd.get('back')) || '/admin/payment-requests';
  const token = await rpc('create_payment_request', { p_loan: loan, p_amount: num(fd.get('amount')), p_note: str(fd.get('note')) || null }, back);
  to(`${back}${back.includes('?') ? '&' : '?'}link=${token}`, 'Payment request created');
}
export async function cancelPaymentRequest(fd: FormData) {
  await rpc('cancel_payment_request', { p_id: str(fd.get('id')) }, '/admin/payment-requests');
  to('/admin/payment-requests', 'Request cancelled');
}
export async function runReminders() {
  const n = await rpc('generate_payment_requests', {}, '/admin/payment-requests');
  to('/admin/payment-requests', `${n} reminder request(s) generated`);
}
export async function reviewDocument(fd: FormData) {
  await rpc('review_document', { p_doc: str(fd.get('id')), p_status: str(fd.get('status')), p_note: str(fd.get('note')) || null }, '/admin/documents');
  to('/admin/documents', 'Document updated');
}
export async function setCustomerStatus(fd: FormData) {
  const id = str(fd.get('id'));
  await rpc('set_customer_status', { p_customer: id, p_status: str(fd.get('status')) }, `/admin/customers/${id}`);
  to(`/admin/customers/${id}`, 'Customer updated');
}
export async function writeOffLoan(fd: FormData) {
  const id = str(fd.get('id'));
  await rpc('write_off_loan', { p_loan: id }, `/admin/loans/${id}`);
  to(`/admin/loans/${id}`, 'Loan written off');
}

type Json = Record<string, unknown>;
function readGroup(existing: Json, fd: FormData, prefix = ''): Json {
  const out: Json = {};
  for (const [k, v] of Object.entries(existing)) {
    const name = prefix + k;
    if (typeof v === 'boolean') out[k] = fd.get(name) === 'on';
    else if (typeof v === 'number') { const n = Number(String(fd.get(name) ?? '').replace(/,/g, '')); if (Number.isNaN(n)) throw new Error(`${k} must be a number`); out[k] = n; }
    else if (Array.isArray(v)) out[k] = str(fd.get(name)).split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    else if (v && typeof v === 'object') out[k] = readGroup(v as Json, fd, name + '.');
    else out[k] = str(fd.get(name));
  }
  return out;
}
export async function saveSettings(fd: FormData) {
  const key = str(fd.get('key')); const back = `/admin/settings?tab=${str(fd.get('tab')) || key}`;
  const sb = await createClient();
  const { data } = await sb.from('settings').select('value').eq('key', key).single();
  if (!data) fail(back, 'Unknown setting');
  let value: Json;
  try { value = readGroup(data!.value as Json, fd); } catch (e) { fail(back, (e as Error).message); return; }
  if (key === 'loan_rules' && (Number(value.min_amount) > Number(value.max_amount) || Number(value.min_months) > Number(value.max_months))) fail(back, 'Minimums cannot exceed maximums');
  if (key === 'admin_emails' && !(value as unknown as string[]).length) fail(back, 'Keep at least one admin email');
  const { error } = await sb.from('settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  if (error) fail(back, error.message);
  await sb.rpc('log_event', { p_action: 'settings.updated', p_entity: 'settings', p_entity_id: key, p_meta: {} });
  revalidatePath('/', 'layout');
  to(back, 'Settings saved');
}
