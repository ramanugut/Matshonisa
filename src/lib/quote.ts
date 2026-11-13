export type Rules = { min_amount: number; max_amount: number; min_months: number; max_months: number; max_active_loans: number; min_payment: number };
export type Fees = { interest_rate_monthly: number; service_fee_monthly: number; initiation_base: number; initiation_pct_above: number; initiation_threshold: number; initiation_cap_amount: number };
export type Quote = { principal: number; months: number; interest: number; service_fees: number; initiation_fee: number; total: number; monthly: number };

/** Mirrors public.quote() in the database. The DB is authoritative; this is for live previews. */
export function quote(amount: number, months: number, f: Fees): Quote {
  const interest = round(amount * f.interest_rate_monthly * months);
  const service_fees = round(f.service_fee_monthly * months);
  const initiation_fee = round(Math.min(f.initiation_base + f.initiation_pct_above * Math.max(amount - f.initiation_threshold, 0), f.initiation_cap_amount ?? 1050));
  const total = amount + interest + service_fees + initiation_fee;
  return { principal: amount, months, interest, service_fees, initiation_fee, total, monthly: round(total / months) };
}
const round = (n: number) => Math.round(n * 100) / 100;

export async function loadRules(supabase: { from: (t: string) => any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await supabase.from('settings').select('key,value').in('key', ['loan_rules', 'fees']);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return { rules: m.loan_rules as Rules, fees: m.fees as Fees };
}
