import { notFound, redirect } from 'next/navigation';
import { requireCustomer } from '@/lib/session';
import { Card, Flash, PageHeader } from '@/components/ui';
import { PayForm } from '@/components/pay-form';
import { payLoan } from '@/app/actions/customer';

export const metadata = { title: 'Make a payment' };
export default async function PayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, customer: c, impersonating } = await requireCustomer();
  const { data: l } = await supabase.from('loans').select('*').eq('id', id).eq('customer_id', c.id).single();
  if (!l) notFound();
  if (!['active', 'overdue'].includes(l.status)) redirect(`/loans/${l.id}`);
  const { data: inst } = await supabase.from('installments').select('*').eq('loan_id', l.id).neq('status', 'paid').order('no').limit(1);
  const { data: rules } = await supabase.from('settings').select('value').eq('key', 'loan_rules').single();
  const outstanding = Number(l.total_repayable) - Number(l.paid_total);
  const nextDue = inst?.[0] ? Number(inst[0].amount) - Number(inst[0].paid_amount) : outstanding;
  return (
    <>
      <PageHeader title="Make a payment" sub={`Loan ${l.ref}`} />
      <Flash err={q.err} />
      <Card className="max-w-xl">
        <PayForm action={payLoan} hidden={{ id: l.id }} full={outstanding} instalment={Math.min(nextDue, outstanding)} min={Number(rules?.value?.min_payment ?? 50)} disabled={impersonating} />
      </Card>
    </>
  );
}
