-- 003: SA ID validation, affordability record, NCA fixes, document gate before payout
alter table public.profiles add column if not exists monthly_expenses numeric(12,2);
alter table public.profiles add column if not exists monthly_debt numeric(12,2);
alter table public.applications add column if not exists consented_at timestamptz;
alter table public.applications add column if not exists affordability jsonb;
alter table public.loans add column if not exists offer_expires_at timestamptz;

create or replace function public.sa_id_dob(p_id text) returns date
language plpgsql immutable set search_path = '' as $$
declare yy int; mm int; dd int; d date; y int;
begin
  if p_id is null or p_id !~ '^[0-9]{13}$' then return null; end if;
  yy := substr(p_id,1,2)::int; mm := substr(p_id,3,2)::int; dd := substr(p_id,5,2)::int;
  foreach y in array array[2000 + yy, 1900 + yy] loop
    begin
      d := make_date(y, mm, dd);
      if d <= current_date then return d; end if;
    exception when others then null;
    end;
  end loop;
  return null;
end $$;

create or replace function public.valid_sa_id(p_id text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare i int; s int := 0; dg int;
begin
  if p_id is null or p_id !~ '^[0-9]{13}$' then return false; end if;
  if public.sa_id_dob(p_id) is null then return false; end if;
  if substr(p_id,11,1) not in ('0','1') then return false; end if;
  for i in 1..13 loop
    dg := substr(p_id, 14 - i, 1)::int;
    if i % 2 = 0 then dg := dg * 2; if dg > 9 then dg := dg - 9; end if; end if;
    s := s + dg;
  end loop;
  return s % 10 = 0;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); is_adm boolean;
begin
  select (public.setting('admin_emails') ? lower(new.email)) into is_adm;
  insert into public.profiles (id, email, full_name, phone, id_number, date_of_birth, role)
  values (new.id, new.email, coalesce(m->>'full_name',''), m->>'phone', m->>'id_number', public.sa_id_dob(m->>'id_number'),
          case when coalesce(is_adm,false) then 'admin' else 'customer' end);
  return new;
end $$;

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    new.role := old.role; new.status := old.status; new.email := old.email;
    if old.id_number is not null then new.id_number := old.id_number; end if;
  end if;
  if new.id_number is not null and public.sa_id_dob(new.id_number) is not null then
    new.date_of_birth := public.sa_id_dob(new.id_number);
  end if;
  return new;
end $$;

update public.profiles set date_of_birth = public.sa_id_dob(id_number) where id_number is not null and public.sa_id_dob(id_number) is not null;

-- NCA: short-term initiation fee is R165 + 10% above R1000, never more than R1050
update public.settings set value = (value - 'initiation_cap_pct') || '{"initiation_cap_amount":1050}'::jsonb where key = 'fees';

create or replace function public.quote(p_amount numeric, p_months int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb := public.setting('loan_rules'); f jsonb := public.setting('fees');
  interest numeric; svc numeric; init numeric; total numeric;
begin
  if p_amount < (r->>'min_amount')::numeric or p_amount > (r->>'max_amount')::numeric then
    raise exception 'Amount must be between R% and R%', r->>'min_amount', r->>'max_amount'; end if;
  if p_months < (r->>'min_months')::int or p_months > (r->>'max_months')::int then
    raise exception 'Term must be between % and % months', r->>'min_months', r->>'max_months'; end if;
  interest := round(p_amount * (f->>'interest_rate_monthly')::numeric * p_months, 2);
  svc := round((f->>'service_fee_monthly')::numeric * p_months, 2);
  init := round(least(
    (f->>'initiation_base')::numeric + (f->>'initiation_pct_above')::numeric * greatest(p_amount - (f->>'initiation_threshold')::numeric, 0),
    (f->>'initiation_cap_amount')::numeric), 2);
  total := p_amount + interest + svc + init;
  return jsonb_build_object('principal', p_amount, 'months', p_months, 'interest', interest,
    'service_fees', svc, 'initiation_fee', init, 'total', total, 'monthly', round(total / p_months, 2));
end $$;

create or replace function public.make_loan(p_app public.applications) returns uuid
language plpgsql security definer set search_path = '' as $$
declare q jsonb := p_app.quote; lid uuid;
begin
  insert into public.loans (application_id, customer_id, principal, months, interest, service_fees, initiation_fee, total_repayable, monthly_instalment, offer_expires_at)
  values (p_app.id, p_app.customer_id, p_app.amount, p_app.months, (q->>'interest')::numeric, (q->>'service_fees')::numeric,
          (q->>'initiation_fee')::numeric, (q->>'total')::numeric, (q->>'monthly')::numeric, now() + interval '10 days')
  returning id into lid;
  return lid;
end $$;

drop function if exists public.submit_application(numeric, int, text);
create or replace function public.submit_application(p_amount numeric, p_months int, p_purpose text default null, p_consent boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.profiles; q jsonb; sc int; s jsonb := public.setting('scoring');
  r jsonb := public.setting('loan_rules'); a public.applications; st text; note text; active int; docs int;
  yrs int; disp numeric; aff jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into p from public.profiles where id = uid;
  if p.status <> 'active' then raise exception 'Account is suspended'; end if;
  if not coalesce(p_consent, false) then raise exception 'Please confirm the declaration and consent to the credit check'; end if;
  if not public.valid_sa_id(p.id_number) then raise exception 'Your ID number is not a valid South African ID number'; end if;
  yrs := date_part('year', age(current_date, public.sa_id_dob(p.id_number)))::int;
  if yrs < 18 then raise exception 'You must be 18 or older to apply for credit'; end if;
  if p.phone is null or coalesce(p.address,'') = '' or p.monthly_income is null or p.monthly_expenses is null or p.bank_name is null or p.account_number is null then
    raise exception 'Please complete your details (address, income, expenses and bank account) first'; end if;
  select count(distinct kind) into docs from public.documents where customer_id = uid and kind in ('id_document','proof_of_address','payslip','bank_statement');
  if docs < 4 then raise exception 'Please upload all four required documents first'; end if;
  select count(*) into active from public.loans where customer_id = uid and status in ('awaiting_acceptance','awaiting_disbursement','active','overdue');
  select active + count(*) into active from public.applications where customer_id = uid and status in ('pending','under_review');
  if active >= (r->>'max_active_loans')::int then raise exception 'You already have an active loan or application'; end if;
  q := public.quote(p_amount, p_months);
  sc := public.sim_score(uid, (q->>'monthly')::numeric);
  disp := p.monthly_income - coalesce(p.monthly_expenses, 0) - coalesce(p.monthly_debt, 0);
  aff := jsonb_build_object('income', p.monthly_income, 'expenses', coalesce(p.monthly_expenses,0), 'debt', coalesce(p.monthly_debt,0),
                            'disposable', disp, 'instalment', (q->>'monthly')::numeric);
  if (s->>'auto_approve')::boolean then
    if p.monthly_income < (s->>'min_income')::numeric then st := 'declined'; note := 'Income below minimum requirement';
    elsif (q->>'monthly')::numeric > disp then st := 'declined'; note := 'Affordability assessment: the monthly instalment is more than your income left after expenses and existing debt repayments. A smaller amount or longer term may work.';
    elsif (q->>'monthly')::numeric > p.monthly_income * (s->>'max_instalment_pct_income')::numeric then st := 'declined'; note := 'Instalment is too high compared with your income';
    elsif sc < (s->>'decline_score')::int then st := 'declined'; note := 'Credit assessment did not meet our requirements';
    elsif sc >= (s->>'approve_score')::int then st := 'approved'; note := 'Passed affordability and credit assessment';
    else st := 'under_review'; note := null; end if;
  else st := 'under_review'; end if;
  insert into public.applications (customer_id, amount, months, purpose, quote, credit_score, status, decision_by, decision_note, decided_at, consented_at, affordability)
  values (uid, p_amount, p_months, p_purpose, q, sc, st,
          case when st in ('approved','declined') then 'system' end, note,
          case when st in ('approved','declined') then now() end, now(), aff)
  returning * into a;
  if st = 'approved' then perform public.make_loan(a); end if;
  perform public.log_event('application.submitted', 'application', a.id::text, jsonb_build_object('status', st, 'score', sc));
  return jsonb_build_object('id', a.id, 'ref', a.ref, 'status', st);
end $$;

create or replace function public.accept_loan(p_loan uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.loans;
begin
  select * into l from public.loans where id = p_loan and customer_id = auth.uid() for update;
  if l.id is null then raise exception 'Loan not found'; end if;
  if l.status <> 'awaiting_acceptance' then raise exception 'Loan cannot be accepted'; end if;
  if l.offer_expires_at is not null and l.offer_expires_at < now() then raise exception 'This offer has expired. Please apply again.'; end if;
  update public.loans set status = 'awaiting_disbursement', accepted_at = now() where id = p_loan;
  update public.applications set status = 'accepted' where id = l.application_id;
  insert into public.disbursements (loan_id, customer_id, amount) values (l.id, l.customer_id, l.principal);
  perform public.log_event('loan.accepted', 'loan', p_loan::text);
end $$;

create or replace function public.mark_disbursed(p_disb uuid, p_reference text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.disbursements; l public.loans; i int; due date; amt numeric; rem numeric;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into d from public.disbursements where id = p_disb for update;
  if d.id is null or d.status <> 'queued' then raise exception 'Disbursement not payable'; end if;
  if not exists (select 1 from public.documents where customer_id = d.customer_id and kind = 'id_document' and status = 'verified')
     or not exists (select 1 from public.documents where customer_id = d.customer_id and kind = 'proof_of_address' and status = 'verified')
     or not exists (select 1 from public.documents where customer_id = d.customer_id and kind in ('payslip','bank_statement') and status = 'verified') then
    raise exception 'Verify the customer''s ID, proof of address and proof of income (Documents page) before paying out'; end if;
  select * into l from public.loans where id = d.loan_id for update;
  update public.disbursements set status = 'paid', paid_at = now(), reference = coalesce(p_reference, 'DSB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))) where id = p_disb;
  update public.loans set status = 'active', disbursed_at = now() where id = l.id;
  rem := l.total_repayable;
  for i in 1..l.months loop
    due := (current_date + (i || ' month')::interval)::date;
    amt := case when i = l.months then rem else l.monthly_instalment end;
    rem := rem - amt;
    insert into public.installments (loan_id, no, due_date, amount) values (l.id, i, due, amt);
  end loop;
  perform public.log_event('disbursement.paid', 'loan', l.id::text, jsonb_build_object('amount', d.amount));
end $$;
