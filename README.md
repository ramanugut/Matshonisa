# Machonisa — quick-loans platform

Next.js 15 (App Router) + Supabase (Postgres, Auth, Storage). 29 routes covering all 27 screens:
public/auth (landing, register, login, forgot/reset password), customer portal (dashboard, apply, status, agreement, loan details, pay, history, documents, profile),
admin portal (dashboard, applications, review, loans, loan management, customers, customer profile, transactions, payment requests, disbursements, document verification, settings + audit log),
and public payment-link + receipt pages.

## Setup
1. Create a Supabase project and run `supabase/migrations/001_schema.sql` then `002_functions.sql` (SQL editor).
2. Copy `.env.example` to `.env.local`; set the project URL and anon key.
3. `npm install && npm run dev`.
4. **Admins:** emails in the `admin_emails` setting (default `ramanugut@gmail.com`) become admins when they register. Edit under Admin → Settings → Admins, or in the `settings` table before registering.
5. Supabase → Authentication → URL configuration: set **Site URL** to your deployed URL and add `<url>/auth/callback` to Redirect URLs. Configure SMTP for reliable emails.

## Deploy (Vercel)
Import the repo, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Done.

## How it works
- All writes go through `security definer` SQL functions (quote, submit_application with simulated credit bureau + auto-approval, accept_loan, mark_disbursed, make_payment, apply_payment, payment requests, document review). Row-level security restricts customers to their own data.
- Reminders: `generate_payment_requests()` creates automatic payment links for upcoming instalments (button in Admin → Payment requests; schedule with pg_cron for daily runs).
- Impersonation: Admin → Customer → "View as customer" (read-only, audited).

## Before taking real money
- Payment gateway is **simulated** (card payments succeed instantly). Integrate PayFast/Paystack and call `apply_payment` from a verified webhook.
- Simulated credit bureau — replace `sim_score()` with a real bureau (e.g. TransUnion/XDS) integration.
- Payouts are manual: pay from your bank, then mark as paid in Admin → Disbursements.
- Email/SMS delivery of payment links is manual (copy / WhatsApp / mailto) until you add a provider.
- Replace placeholders ([NCRCP number], company reg, contacts, bank details) and have the agreement reviewed. NCR registration and legal/compliance review are required to lend.
