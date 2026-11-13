import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from './logo';
import { logout } from '@/app/actions/auth';
import { stopImpersonating } from '@/app/actions/admin';

export type NavItem = { href: string; label: string; icon: string };

const ICONS: Record<string, string> = {
  home: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.6',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  cash: 'M3 7h18v10H3zM12 14a2 2 0 100-4 2 2 0 000 4z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7l-2 4 2 1v1l-2 1 2 4 2-.5 1.5 1L11 20h4l.5-2.5 1.5-1 2 .5 2-4-2-1z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  bell: 'M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0',
  log: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
};
export const Icon = ({ name, className = 'h-5 w-5' }: { name: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={ICONS[name] ?? ICONS.doc} />
  </svg>
);

export function Shell({ nav, active, user, badge, banner, children, mobileNav }:
  { nav: NavItem[]; active: string; user: { name: string; sub: string }; badge?: string; banner?: ReactNode; children: ReactNode; mobileNav?: NavItem[] }) {
  const isActive = (h: string) => active === h || (h !== '/dashboard' && h !== '/admin' && active.startsWith(h));
  const mob = mobileNav ?? nav.slice(0, 5);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-grad-deep p-5 text-white lg:flex">
        <Link href="/" className="mb-8 px-2"><Logo light /></Link>
        {badge && <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-brand-light">{badge}</div>}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive(n.href) ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
              <Icon name={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
        <div className="rounded-xl bg-white/10 p-3 text-sm">
          <div className="truncate font-bold">{user.name}</div><div className="truncate text-xs text-slate-300">{user.sub}</div>
          <form action={logout}><button className="mt-2 text-xs font-semibold text-brand-light hover:underline">Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-navy-900 px-4 py-3 text-white lg:hidden">
          <Link href="/"><Logo light className="h-7" /></Link>
          <form action={logout}><button className="text-xs font-semibold text-brand-light">Sign out</button></form>
        </header>
        {banner}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-9">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${mob.length},1fr)` }}>
        {mob.map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive(n.href) ? 'text-brand-600' : 'text-slate-500'}`}>
            <Icon name={n.icon} className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function ImpersonationBanner({ name }: { name: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950">
      <span>Admin view — read-only, viewing {name}’s account</span>
      <form action={stopImpersonating}><button className="rounded-lg bg-amber-950 px-3 py-1 text-xs text-white">Exit customer view</button></form>
    </div>
  );
}
