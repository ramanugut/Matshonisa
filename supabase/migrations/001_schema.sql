-- Machonisa schema
create extension if not exists pgcrypto;

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  full_name text not null default '',
  email text,
  phone text,
  id_number text,
  date_of_birth date,
  address text,
  employer text,
  monthly_income numeric(12,2),
  bank_name text,
  account_number text,
  account_type text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

create sequence public.app_ref_seq start 10001;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('MA-' || nextval('public.app_ref_seq')),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  months int not null,
  purpose text,
  quote jsonb not null,
  credit_score int,
  status text not null default 'pending' check (status in ('pending','under_review','approved','declined','accepted','cancelled')),
  decision_by text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('ML-' || nextval('public.app_ref_seq')),
  application_id uuid references public.applications(id) on delete set null,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  principal numeric(12,2) not null,
  months int not null,
  interest numeric(12,2) not null,
  service_fees numeric(12,2) not null,
  initiation_fee numeric(12,2) not null,
  total_repayable numeric(12,2) not null,
  monthly_instalment numeric(12,2) not null,
  paid_total numeric(12,2) not null default 0,
  status text not null default 'awaiting_acceptance' check (status in ('awaiting_acceptance','awaiting_disbursement','active','overdue','paid','written_off','cancelled')),
  accepted_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  no int not null,
  due_date date not null,
  amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  status text not null default 'due' check (status in ('due','partial','paid')),
  unique (loan_id, no)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'card',
  status text not null default 'success' check (status in ('pending','success','failed','refunded')),
  reference text not null unique default ('PAY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  recorded_by text,
  created_at timestamptz not null default now()
);

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'manual' check (kind in ('manual','automatic')),
  amount numeric(12,2) not null,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),
  status text not null default 'open' check (status in ('open','paid','expired','cancelled')),
  due_date date,
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.disbursements (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null unique references public.loans(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  status text not null default 'queued' check (status in ('queued','paid','failed')),
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('id_document','proof_of_address','payslip','bank_statement')),
  path text not null,
  file_name text,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_name text,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index on public.applications (customer_id);
create index on public.applications (status);
create index on public.loans (customer_id);
create index on public.loans (status);
create index on public.installments (loan_id, due_date);
create index on public.payments (loan_id);
create index on public.payments (customer_id);
create index on public.payment_requests (loan_id);
create index on public.payment_requests (customer_id);
create index on public.disbursements (customer_id);
create index on public.documents (customer_id);
create index on public.audit_logs (created_at desc);

-- helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.setting(k text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.settings where key = k;
$$;

-- new user -> profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
        is_adm boolean;
begin
  select (public.setting('admin_emails') ? lower(new.email)) into is_adm;
  insert into public.profiles (id, email, full_name, phone, id_number, role)
  values (new.id, new.email, coalesce(m->>'full_name',''), m->>'phone', m->>'id_number',
          case when coalesce(is_adm,false) then 'admin' else 'customer' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    new.role := old.role;
    new.status := old.status;
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger protect_profile_trg before update on public.profiles
  for each row execute function public.protect_profile();

-- RLS
alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.loans enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.payment_requests enable row level security;
alter table public.disbursements enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy settings_admin_write on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy apps_select on public.applications for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy loans_select on public.loans for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy inst_select on public.installments for select to authenticated using (
  exists (select 1 from public.loans l where l.id = loan_id and (l.customer_id = auth.uid() or public.is_admin())));
create policy pay_select on public.payments for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy preq_select on public.payment_requests for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy disb_select on public.disbursements for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy docs_select on public.documents for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy docs_insert on public.documents for insert to authenticated with check (customer_id = auth.uid());
create policy docs_delete on public.documents for delete to authenticated using (customer_id = auth.uid() and status <> 'verified');
create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin());

-- storage
insert into storage.buckets (id, name, public) values ('documents','documents', false) on conflict do nothing;
create policy docs_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy docs_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy docs_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- seed settings
insert into public.settings (key, value) values
 ('admin_emails', '["ramanugut@gmail.com"]'),
 ('loan_rules', '{"min_amount":500,"max_amount":8000,"min_months":1,"max_months":6,"max_active_loans":1,"min_payment":50}'),
 ('fees', '{"interest_rate_monthly":0.05,"service_fee_monthly":69,"initiation_base":165,"initiation_pct_above":0.10,"initiation_threshold":1000,"initiation_cap_pct":0.15}'),
 ('scoring', '{"auto_approve":true,"approve_score":620,"decline_score":480,"max_instalment_pct_income":0.40,"min_income":2500}'),
 ('automation', '{"reminder_days_before":3,"auto_payment_requests":true,"gateway_mode":"simulated"}'),
 ('company', '{"name":"Machonisa Quick Loans","ncr_number":"NCRCP0000","reg_number":"0000/000000/07","support_email":"support@machonisa.co.za","support_phone":"000 000 0000","bank":{"name":"[Bank]","account_name":"Machonisa","account_number":"0000000000","branch":"000000"}}')
on conflict (key) do nothing;
