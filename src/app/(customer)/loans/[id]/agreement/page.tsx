import { notFound, redirect } from 'next/navigation';
import { requireCustomer } from '@/lib/session';
import { Card, Flash, PageHeader, Row } from '@/components/ui';
import { Submit } from '@/components/submit';
import { PrintButton } from '@/components/print-button';
import { acceptLoan } from '@/app/actions/customer';
import { D, R } from '@/lib/format';

export const metadata = { title: 'Loan agreement' };
export default async function Agreement({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, customer: c, impersonating } = await requireCustomer();
  const { data: l } = await supabase.from('loans').select('*').eq('id', id).eq('customer_id', c.id).single();
  if (!l) notFound();
  if (l.status !== 'awaiting_acceptance' && !impersonating) redirect(`/loans/${l.id}`);
  const { data: co } = await supabase.from('settings').select('value').eq('key', 'company').single();
  const company = (co?.value ?? {}) as Record<string, string>;
  const expired = !!l.offer_expires_at && new Date(l.offer_expires_at) < new Date();
  const first = new Date(); first.setMonth(first.getMonth() + 1);
  const cost = Number(l.interest) + Number(l.service_fees) + Number(l.initiation_fee);
  return (
    <>
      <PageHeader title="Loan agreement" sub={`Loan ${l.ref} · please read carefully before accepting`} actions={<PrintButton />} />
      <Flash err={q.err} />
      {expired && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This offer has expired. Please apply again for a new quotation.</div>}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Credit agreement (short-term credit transaction)">
          <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-2 text-sm leading-relaxed text-slate-600">
            <p><b>1. Parties.</b> This credit agreement is between {company.name || 'Machonisa Quick Loans'}, a registered credit provider (NCRCP {company.ncr_number || '[number]'}) (“we”), and {c.full_name}, ID {c.id_number}, of {c.address || 'the address on your profile'} (“you”).</p>
            <p><b>2. The loan.</b> We lend you {R(l.principal)} and pay it into your bank account ending {c.account_number?.slice(-4)}. This is a short-term credit transaction under the National Credit Act, 2005 (NCA).</p>
            <p><b>3. Cost of credit.</b> Interest at 5% per month ({R(l.interest)} in total), a monthly service fee ({R(l.service_fees)} in total) and a once-off initiation fee ({R(l.initiation_fee)}). Total cost of credit: {R(cost)}. These are within the maximum rates and fees allowed by the NCA regulations. No other fees may be charged to you.</p>
            <p><b>4. Repayment.</b> You repay {R(l.total_repayable)} in {l.months} monthly instalment{l.months > 1 ? 's' : ''} of about {R(l.monthly_instalment)}, the first one month after we pay you. You may pay more, or settle the loan early, at any time. Early settlement reduces the interest and service fees still to come (NCA section 125).</p>
            <p><b>5. Affordability.</b> We assessed your income, expenses and existing debt before offering this loan. If anything you told us was untrue, we may cancel the agreement and demand repayment.</p>
            <p><b>6. If you fall behind.</b> We will first send you a notice about the arrears (NCA section 129) and give you a chance to catch up, talk to us or approach a debt counsellor, ombud or consumer court before any legal steps. The total interest, fees and charges on an amount in default can never be more than the amount you originally borrowed (the “in duplum” rule). Only reasonable collection costs allowed by law may be added.</p>
            <p><b>7. Credit bureaus.</b> We may report how you manage this account to registered credit bureaus. You may ask to see and correct your credit record.</p>
            <p><b>8. Cooling-off.</b> If this agreement was concluded as a result of direct marketing, you may cancel it within 5 business days by repaying what you received, as the NCA allows.</p>
            <p><b>9. Your rights.</b> We will never keep your ID, bank card or PIN as security. You may get a copy of this agreement and statements of your account at any time. If you have a complaint, contact us first at {company.support_email || '[support email]'}; you may also contact the National Credit Regulator (0860 627 627) or the National Consumer Tribunal.</p>
            <p><b>10. Privacy.</b> We process your personal information under POPIA only to assess, administer and collect this loan and as the law requires.</p>
            <p className="text-xs text-slate-400">[Have this agreement reviewed by your legal advisor and confirm it against the current NCA regulations before going live.]</p>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Your loan">
            <Row k="Amount you receive" v={R(l.principal)} /><Row k="Term" v={`${l.months} ${l.months === 1 ? 'month' : 'months'}`} /><Row k="Interest" v={R(l.interest)} />
            <Row k="Service fees" v={R(l.service_fees)} /><Row k="Initiation fee" v={R(l.initiation_fee)} /><Row k="Monthly instalment" v={R(l.monthly_instalment)} />
            <Row k="First instalment (about)" v={D(first)} /><Row k="Total to repay" v={<span className="text-lg">{R(l.total_repayable)}</span>} />
            {l.offer_expires_at && <Row k="Offer valid until" v={D(l.offer_expires_at)} />}
          </Card>
          <form action={acceptLoan} className="card p-5"><input type="hidden" name="id" value={l.id} />
            <label className="flex items-start gap-2.5 text-sm text-slate-600"><input type="checkbox" name="agree" className="mt-1 h-4 w-4 accent-brand" />
              I have read and understood this agreement, including the costs and what happens if I miss a payment, and I accept it.</label>
            <Submit className="btn-primary mt-4 w-full" pending="Accepting…" disabled={impersonating || expired}>Accept & get paid</Submit>
            <p className="mt-3 text-xs text-slate-500">After you accept, we verify your documents and then pay you by EFT.</p>
          </form>
        </div>
      </div>
    </>
  );
}
