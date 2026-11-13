'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fail, num, rpc, str, to } from '@/lib/actions';
import { redirect } from 'next/navigation';
import { validSaPhone } from '@/lib/sa-id';

const safe = (p: string) => (p.startsWith('/') && !p.startsWith('//') ? p : '');

export async function saveProfile(fd: FormData) {
  const back = safe(str(fd.get('back'))) || '/profile';
  const next = safe(str(fd.get('next')));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) fail('/login', 'Please sign in');
  const phone = str(fd.get('phone'));
  if (!validSaPhone(phone)) fail(back, 'Enter a valid South African mobile number, e.g. 082 123 4567');
  const acct = str(fd.get('account_number')).replace(/\s/g, '');
  if (!/^\d{6,16}$/.test(acct)) fail(back, 'Bank account number must be 6–16 digits');
  if (!str(fd.get('bank_name'))) fail(back, 'Choose your bank');
  if (!str(fd.get('address'))) fail(back, 'Enter your residential address');
  const income = num(fd.get('monthly_income'));
  const expenses = num(fd.get('monthly_expenses'));
  const debt = num(fd.get('monthly_debt'));
  if (!(income > 0)) fail(back, 'Enter your monthly take-home income');
  if (fd.get('monthly_expenses') === null || str(fd.get('monthly_expenses')) === '') fail(back, 'Enter your monthly living expenses (use 0 if none)');
  const { error } = await supabase.from('profiles').update({
    full_name: str(fd.get('full_name')), phone, address: str(fd.get('address')), employer: str(fd.get('employer')) || null,
    monthly_income: income, monthly_expenses: expenses, monthly_debt: debt,
    bank_name: str(fd.get('bank_name')), account_number: acct, account_type: str(fd.get('account_type')) || null,
  }).eq('id', user!.id);
  if (error) fail(back, error.message);
  revalidatePath('/', 'layout');
  if (next) redirect(next);
  to('/profile', 'Profile saved');
}

export async function changePassword(fd: FormData) {
  const pw = str(fd.get('password'));
  if (pw.length < 8) fail('/profile', 'Password must be at least 8 characters');
  if (pw !== str(fd.get('confirm'))) fail('/profile', 'Passwords do not match');
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) fail('/profile', error.message);
  to('/profile', 'Password changed');
}

export async function applyForLoan(fd: FormData) {
  const back = safe(str(fd.get('back'))) || '/apply';
  const r = (await rpc('submit_application', {
    p_amount: num(fd.get('amount')), p_months: num(fd.get('months')), p_purpose: str(fd.get('purpose')) || null, p_consent: !!fd.get('consent'),
  }, back)) as { id: string };
  to(`/applications/${r.id}`);
}

export async function cancelApplication(fd: FormData) {
  const id = str(fd.get('id'));
  await rpc('cancel_application', { p_app: id }, `/applications/${id}`);
  to('/dashboard', 'Application cancelled');
}

export async function acceptLoan(fd: FormData) {
  const id = str(fd.get('id'));
  if (!fd.get('agree')) fail(`/loans/${id}/agreement`, 'Please tick the box to accept the agreement');
  await rpc('accept_loan', { p_loan: id }, `/loans/${id}/agreement`);
  to(`/loans/${id}`, 'Agreement accepted. Your payout is now queued.');
}

export async function payLoan(fd: FormData) {
  const id = str(fd.get('id'));
  const mode = str(fd.get('mode'));
  const amount = mode === 'custom' ? num(fd.get('custom')) : num(fd.get(mode));
  const r = (await rpc('make_payment', { p_loan: id, p_amount: amount, p_method: str(fd.get('method')) || 'card' }, `/loans/${id}/pay`)) as { reference: string };
  to(`/receipt/${r.reference}`);
}

export async function uploadDocument(fd: FormData) {
  const back = safe(str(fd.get('back'))) || '/documents';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) fail('/login', 'Please sign in');
  const file = fd.get('file') as File | null;
  const kind = str(fd.get('kind'));
  if (!['id_document', 'proof_of_address', 'payslip', 'bank_statement'].includes(kind)) fail(back, 'Unknown document type');
  if (!file || !file.size) fail(back, 'Choose a file to upload');
  if (file!.size > 4 * 1024 * 1024) fail(back, 'File is too large (max 4 MB). Take a smaller photo or compress the PDF.');
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file!.type)) fail(back, 'Only PDF, JPG or PNG files are accepted');
  const fname = file!.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${user!.id}/${kind}-${Date.now()}-${fname}`;
  const up = await supabase.storage.from('documents').upload(path, file!, { contentType: file!.type });
  if (up.error) fail(back, up.error.message);
  const { error } = await supabase.from('documents').insert({ customer_id: user!.id, kind, path, file_name: file!.name });
  if (error) fail(back, error.message);
  to(back, 'Document uploaded');
}

export async function deleteDocument(fd: FormData) {
  const back = safe(str(fd.get('back'))) || '/documents';
  const supabase = await createClient();
  const id = str(fd.get('id'));
  const { data } = await supabase.from('documents').select('path,status').eq('id', id).single();
  if (data && data.status !== 'verified') {
    await supabase.storage.from('documents').remove([data.path]);
    await supabase.from('documents').delete().eq('id', id);
  }
  to(back, 'Document removed');
}
