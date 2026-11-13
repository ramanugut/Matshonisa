-- Business logic. All mutations go through these security-definer functions.

create or replace function public.log_event(p_action text, p_entity text, p_entity_id text, p_meta jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  select full_name into nm from public.profiles where id = auth.uid();
  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, meta)
  values (auth.uid(), coalesce(nm, 'system'), p_action, p_entity, p_entity_id, p_meta);
end $$;

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
  init := least(
    (f->>'initiation_base')::numeric + (f->>'initiation_pct_above')::numeric * greatest(p_amount - (f->>'initiation_threshold')::numeric, 0),
    (f->>'initiation_cap_pct')::numeric * p_amount);
  init := round(init, 2);
  total := p_amount + interest + svc + init;
  return jsonb_build_object('principal', p_amount, 'months', p_months, 'interest', interest,
    'service_fees', svc, 'initiation_fee', init, 'total', total, 'monthly', round(total / p_months, 2));
end $$;

-- Simulated credit bureau: deterministic from ID number, income, affordability and history.
create or replace function public.sim_score(p_customer uuid, p_monthly numeric) returns int
language plpgsql security definer set search_path = '' as $$
declare p public.profiles; noise int; sc numeric; ratio numeric; hist numeric;
begin
  select * into p from public.profiles where id = p_customer;
  noise := abs(hashtext(coalesce(p.id_number, p.id::text))) % 101;
  ratio := case when coalesce(p.monthly_income,0) > 0 then p_monthly / p.monthly_income else 1 end;
  select coalesce(sum(case when l.status in ('overdue','written_off') then -120 when l.status = 'paid' then 30 else 0 end),0)
    into hist from public.loans l where l.customer_id = p_customer;
  sc := 450 + noise + least(coalesce(p.monthly_income,0) / 200, 150) - ratio * 200 + least(hist, 90);
  return greatest(300, least(850, round(sc)))::int;
end $$;

create or replace function public.make_loan(p_app public.applications) returns uuid
language plpgsql security definer set search_path = '' as $$
declare q jsonb := p_app.quote; lid uuid;
begin
  insert into public.loans (application_id, customer_id, principal, months, interest, service_fees, initiation_fee, total_repayable, monthly_instalment)
  values (p_app.id, p_app.customer_id, p_app.amount, p_app.months, (q->>'interest')::numeric, (q->>'service_fees')::numeric,
          (q->>'initiation_fee')::numeric, (q->>'total')::numeric, (q->>'monthly')::numeric)
  returning id into lid;
  return lid;
end $$;

create or replace function public.submit_application(p_amount numeric, p_months int, p_purpose text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.profiles; q jsonb; sc int; s jsonb := public.setting('scoring');
  r jsonb := public.setting('loan_rules'); a public.applications; st text; note text; active int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into p from public.profiles where id = uid;
  if p.status <> 'active' then raise exception 'Account is suspended'; end if;
  if p.id_number is null or p.phone is null or p.monthly_income is null or p.bank_name is null or p.account_number is null then
    raise exception 'Please complete your profile (ID, phone, income and bank details) first'; end if;
  select count(*) into active from public.loans where customer_id = uid and status in ('awaiting_acceptance','awaiting_disbursement','active','overdue');
  select active + count(*) into active from public.applications where customer_id = uid and status in ('pending','under_review');
  if active >= (r->>'max_active_loans')::int then raise exception 'You already have an active loan or application'; end if;
  q := public.quote(p_amount, p_months);
  sc := public.sim_score(uid, (q->>'monthly')::numeric);
  if (s->>'auto_approve')::boolean then
    if p.monthly_income < (s->>'min_income')::numeric then st := 'declined'; note := 'Income below minimum requirement';
    elsif (q->>'monthly')::numeric > p.monthly_income * (s->>'max_instalment_pct_income')::numeric then st := 'declined'; note := 'Instalment not affordable against stated income';
    elsif sc < (s->>'decline_score')::int then st := 'declined'; note := 'Credit score below minimum';
    elsif sc >= (s->>'approve_score')::int then st := 'approved'; note := 'Auto-approved by scoring rules';
    else st := 'under_review'; note := null; end if;
  else st := 'under_review'; end if;
  insert into public.applications (customer_id, amount, months, purpose, quote, credit_score, status, decision_by, decision_note, decided_at)
  values (uid, p_amount, p_months, p_purpose, q, sc, st,
          case when st in ('approved','declined') then 'system' end, note,
          case when st in ('approved','declined') then now() end)
  returning * into a;
  if st = 'approved' then perform public.make_loan(a); end if;
  perform public.log_event('application.submitted', 'application', a.id::text, jsonb_build_object('status', st, 'score', sc));
  return jsonb_build_object('id', a.id, 'ref', a.ref, 'status', st);
end $$;

create or replace function public.decide_application(p_app uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.applications; nm text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_decision not in ('approved','declined') then raise exception 'Invalid decision'; end if;
  select * into a from public.applications where id = p_app for update;
  if a.id is null then raise exception 'Not found'; end if;
  if a.status not in ('pending','under_review') then raise exception 'Application already decided'; end if;
  select full_name into nm from public.profiles where id = auth.uid();
  update public.applications set status = p_decision, decision_by = nm, decision_note = p_note, decided_at = now() where id = p_app returning * into a;
  if p_decision = 'approved' then perform public.make_loan(a); end if;
  perform public.log_event('application.' || p_decision, 'application', p_app::text, jsonb_build_object('note', p_note));
end $$;

create or replace function public.cancel_application(p_app uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.applications set status = 'cancelled' where id = p_app and customer_id = auth.uid() and status in ('pending','under_review');
  update public.loans set status = 'cancelled' where application_id = p_app and customer_id = auth.uid() and status = 'awaiting_acceptance';
  perform public.log_event('application.cancelled', 'application', p_app::text);
end $$;

create or replace function public.accept_loan(p_loan uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.loans;
begin
  select * into l from public.loans where id = p_loan and customer_id = auth.uid() for update;
  if l.id is null then raise exception 'Loan not found'; end if;
  if l.status <> 'awaiting_acceptance' then raise exception 'Loan cannot be accepted'; end if;
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

create or replace function public.fail_disbursement(p_disb uuid, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.disbursements set status = 'failed' where id = p_disb and status = 'queued';
  perform public.log_event('disbursement.failed', 'disbursement', p_disb::text, jsonb_build_object('note', p_note));
end $$;

-- internal: allocate a payment to the loan's oldest unpaid instalments
create or replace function public.apply_payment(p_loan uuid, p_amount numeric, p_method text, p_by text)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare l public.loans; left_ numeric := p_amount; r record; pay public.payments; apply_ numeric; outstanding numeric;
begin
  select * into l from public.loans where id = p_loan for update;
  if l.id is null or l.status not in ('active','overdue') then raise exception 'Loan is not open for payment'; end if;
  outstanding := l.total_repayable - l.paid_total;
  if p_amount <= 0 or p_amount > outstanding then raise exception 'Amount must be between R0.01 and R%', outstanding; end if;
  insert into public.payments (loan_id, customer_id, amount, method, recorded_by) values (p_loan, l.customer_id, p_amount, p_method, p_by) returning * into pay;
  for r in select * from public.installments where loan_id = p_loan and status <> 'paid' order by no loop
    exit when left_ <= 0;
    apply_ := least(left_, r.amount - r.paid_amount);
    update public.installments set paid_amount = paid_amount + apply_,
      status = case when paid_amount + apply_ >= amount then 'paid' else 'partial' end where id = r.id;
    left_ := left_ - apply_;
  end loop;
  update public.loans set paid_total = paid_total + p_amount,
    status = case when paid_total + p_amount >= total_repayable then 'paid' else 'active' end where id = p_loan;
  perform public.refresh_overdue();
  return pay;
end $$;

create or replace function public.make_payment(p_loan uuid, p_amount numeric, p_method text default 'card')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pay public.payments; min_p numeric := (public.setting('loan_rules')->>'min_payment')::numeric; l public.loans;
begin
  select * into l from public.loans where id = p_loan and customer_id = auth.uid();
  if l.id is null then raise exception 'Loan not found'; end if;
  if p_amount < least(min_p, l.total_repayable - l.paid_total) then raise exception 'Minimum payment is R%', min_p; end if;
  -- gateway_mode "simulated": payment is treated as successful. Replace with provider webhook for live card payments.
  pay := public.apply_payment(p_loan, p_amount, p_method, 'customer');
  perform public.log_event('payment.received', 'payment', pay.id::text, jsonb_build_object('amount', p_amount));
  return jsonb_build_object('reference', pay.reference);
end $$;

create or replace function public.admin_record_payment(p_loan uuid, p_amount numeric, p_method text default 'eft')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pay public.payments;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  pay := public.apply_payment(p_loan, p_amount, p_method, 'admin');
  perform public.log_event('payment.recorded', 'payment', pay.id::text, jsonb_build_object('amount', p_amount, 'method', p_method));
  return jsonb_build_object('reference', pay.reference);
end $$;

create or replace function public.create_payment_request(p_loan uuid, p_amount numeric, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare l public.loans; t text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into l from public.loans where id = p_loan;
  if l.id is null or l.status not in ('active','overdue') then raise exception 'Loan is not open'; end if;
  insert into public.payment_requests (loan_id, customer_id, kind, amount, note, due_date)
  values (p_loan, l.customer_id, 'manual', least(p_amount, l.total_repayable - l.paid_total), p_note, current_date + 7) returning token into t;
  perform public.log_event('payment_request.created', 'loan', p_loan::text, jsonb_build_object('amount', p_amount));
  return t;
end $$;

create or replace function public.cancel_payment_request(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.payment_requests set status = 'cancelled' where id = p_id and status = 'open';
end $$;

-- public pay page
create or replace function public.get_payment_request(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.payment_requests; l public.loans; p public.profiles;
begin
  select * into r from public.payment_requests where token = p_token;
  if r.id is null then return null; end if;
  select * into l from public.loans where id = r.loan_id;
  select * into p from public.profiles where id = r.customer_id;
  return jsonb_build_object('status', r.status, 'amount', r.amount, 'due_date', r.due_date, 'note', r.note, 'kind', r.kind,
    'loan_ref', l.ref, 'first_name', split_part(p.full_name, ' ', 1), 'outstanding', l.total_repayable - l.paid_total,
    'min_payment', (public.setting('loan_rules')->>'min_payment')::numeric);
end $$;

create or replace function public.pay_with_token(p_token text, p_amount numeric, p_method text default 'card') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.payment_requests; pay public.payments;
begin
  select * into r from public.payment_requests where token = p_token for update;
  if r.id is null or r.status <> 'open' then raise exception 'This payment request is no longer open'; end if;
  pay := public.apply_payment(r.loan_id, p_amount, p_method, 'payment_link');
  if p_amount >= r.amount then update public.payment_requests set status = 'paid', paid_at = now() where id = r.id; end if;
  return jsonb_build_object('reference', pay.reference);
end $$;

create or replace function public.get_receipt(p_ref text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pay public.payments; l public.loans; p public.profiles;
begin
  select * into pay from public.payments where reference = p_ref;
  if pay.id is null then return null; end if;
  select * into l from public.loans where id = pay.loan_id;
  select * into p from public.profiles where id = pay.customer_id;
  return jsonb_build_object('reference', pay.reference, 'amount', pay.amount, 'method', pay.method, 'date', pay.created_at,
    'loan_ref', l.ref, 'customer', p.full_name, 'outstanding', l.total_repayable - l.paid_total, 'loan_status', l.status);
end $$;

-- housekeeping (run by pg_cron)
create or replace function public.refresh_overdue() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.loans l set status = 'overdue' where l.status = 'active'
    and exists (select 1 from public.installments i where i.loan_id = l.id and i.status <> 'paid' and i.due_date < current_date);
  update public.loans l set status = 'active' where l.status = 'overdue'
    and not exists (select 1 from public.installments i where i.loan_id = l.id and i.status <> 'paid' and i.due_date < current_date);
end $$;

create or replace function public.generate_payment_requests() returns int
language plpgsql security definer set search_path = '' as $$
declare a jsonb := public.setting('automation'); n int := 0; r record;
begin
  perform public.refresh_overdue();
  if not coalesce((a->>'auto_payment_requests')::boolean, false) then return 0; end if;
  for r in
    select i.*, l.customer_id from public.installments i join public.loans l on l.id = i.loan_id
    where i.status <> 'paid' and l.status in ('active','overdue')
      and i.due_date <= current_date + (a->>'reminder_days_before')::int
      and not exists (select 1 from public.payment_requests q where q.loan_id = i.loan_id and q.kind = 'automatic' and q.status = 'open' and q.due_date = i.due_date)
  loop
    insert into public.payment_requests (loan_id, customer_id, kind, amount, due_date, note)
    values (r.loan_id, r.customer_id, 'automatic', r.amount - r.paid_amount, r.due_date, 'Instalment ' || r.no || ' reminder');
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'pending_apps', (select count(*) from public.applications where status in ('pending','under_review')),
    'active_loans', (select count(*) from public.loans where status in ('active','overdue')),
    'overdue_loans', (select count(*) from public.loans where status = 'overdue'),
    'book_outstanding', (select coalesce(sum(total_repayable - paid_total),0) from public.loans where status in ('active','overdue')),
    'disbursed_total', (select coalesce(sum(amount),0) from public.disbursements where status = 'paid'),
    'collected_total', (select coalesce(sum(amount),0) from public.payments where status = 'success'),
    'collected_month', (select coalesce(sum(amount),0) from public.payments where status = 'success' and created_at >= date_trunc('month', now())),
    'queued_disb', (select count(*) from public.disbursements where status = 'queued'),
    'pending_docs', (select count(*) from public.documents where status = 'pending'));
end $$;

create or replace function public.review_document(p_doc uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select full_name into nm from public.profiles where id = auth.uid();
  update public.documents set status = p_status, note = p_note, reviewed_by = nm, reviewed_at = now() where id = p_doc;
  perform public.log_event('document.' || p_status, 'document', p_doc::text, jsonb_build_object('note', p_note));
end $$;

create or replace function public.set_customer_status(p_customer uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles set status = p_status where id = p_customer and role = 'customer';
  perform public.log_event('customer.' || p_status, 'customer', p_customer::text);
end $$;

create or replace function public.write_off_loan(p_loan uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.loans set status = 'written_off' where id = p_loan and status in ('active','overdue');
  perform public.log_event('loan.written_off', 'loan', p_loan::text);
end $$;

alter policy settings_read on public.settings
  using (key in ('loan_rules','fees') or public.is_admin());

-- grants: lock everything down, then open only what's needed
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin(), public.setting(text) to anon, authenticated;
grant execute on function public.quote(numeric,int), public.get_payment_request(text), public.pay_with_token(text,numeric,text), public.get_receipt(text) to anon, authenticated;
grant execute on function public.submit_application(numeric,int,text), public.cancel_application(uuid), public.accept_loan(uuid), public.make_payment(uuid,numeric,text) to authenticated;
grant execute on function public.decide_application(uuid,text,text), public.mark_disbursed(uuid,text), public.fail_disbursement(uuid,text),
  public.admin_record_payment(uuid,numeric,text), public.create_payment_request(uuid,numeric,text), public.cancel_payment_request(uuid),
  public.admin_stats(), public.review_document(uuid,text,text), public.set_customer_status(uuid,text), public.write_off_loan(uuid),
  public.refresh_overdue(), public.generate_payment_requests() to authenticated;
