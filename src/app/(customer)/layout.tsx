import { headers } from 'next/headers';
import { Shell, ImpersonationBanner, type NavItem } from '@/components/shell';
import { requireCustomer } from '@/lib/session';

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/apply', label: 'Apply', icon: 'plus' },
  { href: '/history', label: 'History', icon: 'list' },
  { href: '/documents', label: 'Documents', icon: 'doc' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];
export const dynamic = 'force-dynamic';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { customer, impersonating } = await requireCustomer();
  const path = (await headers()).get('x-pathname') ?? '/dashboard';
  return (
    <Shell nav={NAV} active={path} user={{ name: customer.full_name || 'Customer', sub: customer.email ?? '' }}
      banner={impersonating ? <ImpersonationBanner name={customer.full_name} /> : undefined}>
      {children}
    </Shell>
  );
}
