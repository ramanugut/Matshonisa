export const R = (n: number | string | null | undefined) =>
  'R' + Number(n ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ');
export const R0 = (n: number | string | null | undefined) =>
  'R' + Number(n ?? 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 }).replace(/\u00a0/g, ' ');
export const D = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const DT = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const site = () =>
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
