'use client';
import { useState } from 'react';
import { Calculator } from '@/components/calculator';
import { Card, Select } from '@/components/ui';
import type { Fees, Rules } from '@/lib/quote';

export const PURPOSES = ['Emergency expense', 'Education', 'Transport', 'Home & household', 'Medical', 'Business', 'Other'];

export function LoanStep({ rules, fees, initial, purpose }: { rules: Rules; fees: Fees; initial: { amount: number; months: number }; purpose: string }) {
  const [v, setV] = useState(initial);
  return (
    <form action="/apply" method="get">
      <input type="hidden" name="step" value="details" />
      <input type="hidden" name="amount" value={v.amount} /><input type="hidden" name="months" value={v.months} />
      <Card><Calculator rules={rules} fees={fees} compact initial={initial} onChange={(amount, months) => setV({ amount, months })} /></Card>
      <Card className="mt-6">
        <div className="max-w-md"><Select label="What’s the loan for?" name="purpose" options={PURPOSES} defaultValue={purpose || PURPOSES[0]} /></div>
        <button className="btn-primary mt-5 px-6">Continue</button>
      </Card>
    </form>
  );
}
