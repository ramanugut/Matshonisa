import { requireAdmin } from '@/lib/session';
import { Badge, Card, Flash, PageHeader, Table, Tabs, Td } from '@/components/ui';
import { Submit } from '@/components/submit';
import { saveSettings } from '@/app/actions/admin';
import { DT } from '@/lib/format';

export const metadata = { title: 'System settings' };
type Json = Record<string, unknown>;
const TABS: [string, string, string][] = [
  ['loan_rules', 'Loan rules', 'Limits applied to every application.'],
  ['fees', 'Interest & fees', 'Rates are decimals: 0.05 = 5%.'],
  ['scoring', 'Credit scoring', 'Controls auto-approval and decline. Scores come from the simulated bureau.'],
  ['automation', 'Automation', 'Reminders and payment-link automation.'],
  ['company', 'Company', 'Shown on agreements and receipts.'],
  ['admin_emails', 'Admins', 'Emails that become admins when they register (comma separated).'],
];
const LABELS: Record<string, string> = {
  min_amount: 'Minimum loan (R)', max_amount: 'Maximum loan (R)', min_months: 'Minimum term (months)', max_months: 'Maximum term (months)', max_active_loans: 'Max active loans per customer', min_payment: 'Minimum partial payment (R)',
  interest_rate_monthly: 'Interest per month (0.05 = 5%)', service_fee_monthly: 'Service fee per month (R)', initiation_base: 'Initiation fee base (R)', initiation_pct_above: 'Initiation % above threshold (0.10 = 10%)', initiation_threshold: 'Initiation threshold (R)', initiation_cap_pct: 'Initiation fee cap (% of loan)',
  auto_approve: 'Enable auto-approval', approve_score: 'Auto-approve at score ≥', decline_score: 'Auto-decline at score <', max_instalment_pct_income: 'Max instalment as share of income (0.40 = 40%)', min_income: 'Minimum monthly income (R)',
  reminder_days_before: 'Send reminder days before due', auto_payment_requests: 'Generate automatic payment requests', gateway_mode: 'Payment gateway mode',
  name: 'Name', ncr_number: 'NCR registration number', reg_number: 'Company registration number', support_email: 'Support email', support_phone: 'Support phone', bank: 'Bank', account_name: 'Account name', account_number: 'Account number', branch: 'Branch code',
};
function Fields({ v, prefix = '' }: { v: Json; prefix?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(v).map(([k, val]) => {
        const name = prefix + k;
        if (typeof val === 'boolean') return <label key={name} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold"><input type="checkbox" name={name} defaultChecked={val} className="h-4 w-4 accent-brand" />{LABELS[k] ?? k}</label>;
        if (val && typeof val === 'object' && !Array.isArray(val)) return <div key={name} className="sm:col-span-2"><div className="label">{LABELS[k] ?? k}</div><Fields v={val as Json} prefix={name + '.'} /></div>;
        const isNum = typeof val === 'number';
        return <div key={name}><label className="label" htmlFor={name}>{LABELS[k] ?? k}</label><input id={name} name={name} type={isNum ? 'number' : 'text'} step={isNum ? 'any' : undefined} defaultValue={Array.isArray(val) ? val.join(', ') : String(val)} className="input" /></div>;
      })}
    </div>
  );
}
export default async function Settings({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; err?: string }> }) {
  const { tab = 'loan_rules', ok, err } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: rows } = await supabase.from('settings').select('key,value');
  const m = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value])) as Record<string, Json>;
  const { data: logs } = tab === 'audit' ? await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(150) : { data: null };
  const current = TABS.find((t) => t[0] === tab);
  return (
    <>
      <PageHeader title="System settings" sub="Changes apply immediately to new applications and quotes." />
      <Flash ok={ok} err={err} />
      <Tabs current={tab} items={[...TABS.map(([k, l]) => ({ key: k, label: l, href: `?tab=${k}` })), { key: 'audit', label: 'Audit log', href: '?tab=audit' }]} />
      {current && m[current[0]] && (
        <Card title={current[1]}>
          <p className="mb-4 text-sm text-slate-500">{current[2]}</p>
          {tab === 'automation' && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Payment gateway is in <b>simulated</b> mode: card payments are marked successful instantly. Connect a live provider (e.g. PayFast / Paystack) before taking real money.</p>}
          <form action={saveSettings} className="space-y-5"><input type="hidden" name="key" value={current[0]} /><input type="hidden" name="tab" value={tab} />
            {current[0] === 'admin_emails'
              ? <div><label className="label" htmlFor="admin_emails">Admin emails</label><textarea id="admin_emails" name="admin_emails" rows={3} className="input" defaultValue={(m.admin_emails as unknown as string[]).join(', ')} /></div>
              : <Fields v={m[current[0]]} />}
            <Submit className="btn-primary" pending="Saving…">Save changes</Submit></form>
        </Card>)}
      {tab === 'audit' && (logs?.length ? (
        <Table head={['When', 'Who', 'Action', 'Entity', 'Detail']}>
          {logs.map((l) => (<tr key={l.id}><Td>{DT(l.created_at)}</Td><Td>{l.actor_name}</Td><Td><Badge status="open">{l.action}</Badge></Td><Td className="text-xs">{l.entity} {String(l.entity_id ?? '').slice(0, 8)}</Td><Td className="max-w-xs truncate font-mono text-xs text-slate-500">{JSON.stringify(l.meta)}</Td></tr>))}
        </Table>) : <p className="text-sm text-slate-500">No events yet.</p>)}
    </>
  );
}
