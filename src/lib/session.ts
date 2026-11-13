import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type Profile = {
  id: string; role: 'customer' | 'admin'; full_name: string; email: string | null; phone: string | null;
  id_number: string | null; date_of_birth: string | null; address: string | null; employer: string | null;
  monthly_income: number | null; monthly_expenses: number | null; monthly_debt: number | null; bank_name: string | null; account_number: string | null; account_type: string | null;
  status: 'active' | 'suspended'; created_at: string;
};

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { supabase, user, profile: (data as Profile) ?? null };
}

/** Customer pages. Admins may view a customer read-only via the impersonation cookie. */
export async function requireCustomer() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect('/login');
  let viewing: Profile = s.profile;
  let impersonating = false;
  if (s.profile.role === 'admin') {
    const id = (await cookies()).get('impersonate')?.value;
    if (!id) redirect('/admin');
    const { data } = await s.supabase.from('profiles').select('*').eq('id', id).single();
    if (!data) redirect('/admin/customers');
    viewing = data as Profile;
    impersonating = true;
  }
  return { ...s, profile: s.profile, customer: viewing, impersonating };
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect('/login');
  if (s.profile.role !== 'admin') redirect('/dashboard');
  return { ...s, profile: s.profile };
}
