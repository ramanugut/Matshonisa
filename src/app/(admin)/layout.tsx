import { headers } from 'next/headers';
import { Shell, type NavItem } from '@/components/shell';
import { requireAdmin } from '@/lib/session';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'home' },
  { href: '/admin/applications', label: 'Applications', icon: 'inbox' },
  { href: '/admin/loans', label: 'Loans', icon: 'list' },
  { href: '/admin/customers', label: 'Customers', icon: 'users' },
  { href: '/admin/payments', label: 'Payments', icon: 'cash' },
  { href: '/admin/payment-requests', label: 'Payment requests', icon: 'link' },
  { href: '/admin/disbursements', label: 'Disbursements', icon: 'send' },
  { href: '/admin/documents', label: 'Documents', icon: 'shield' },
  { href: '/admin/settings', label: 'Settings', icon: 'gear' },
];
const MOBILE: NavItem[] = [NAV[0], NAV[1], NAV[2], NAV[3], { href: '/admin/settings', label: 'More', icon: 'gear' }];
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireAdmin();
  const path = (await headers()).get('x-pathname') ?? '/admin';
  const { count } = await supabase.from('applications').select('id', { count: 'exact', head: true }).in('status', ['pending', 'under_review']);
  const nav = NAV.map((n) => (n.href === '/admin/applications' && count ? { ...n, label: `Applications (${count})` } : n));
  return (
    <Shell nav={nav} mobileNav={MOBILE} active={path} badge="Admin console" user={{ name: profile.full_name || 'Admin', sub: profile.email ?? '' }}>
      {children}
      <nav className="mt-10 flex flex-wrap gap-2 text-sm lg:hidden">
        {NAV.slice(4).map((n) => <a key={n.href} href={n.href} className="btn-ghost">{n.label}</a>)}
      </nav>
    </Shell>
  );
}
