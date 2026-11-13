import Link from 'next/link';
import { Logo } from './logo';
import { getSession } from '@/lib/session';

export async function PublicNav({ dark = true }: { dark?: boolean }) {
  const { profile } = await getSession();
  const home = profile?.role === 'admin' ? '/admin' : '/dashboard';
  return (
    <header className={dark ? 'text-white' : 'text-navy-900'}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo light={dark} /></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold sm:flex">
          <a href="/#how">How it works</a><a href="/#calculator">Calculator</a><a href="/#faq">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {profile ? <Link href={home} className="btn-primary">My account</Link> : (<>
            <Link href="/login" className={`btn ${dark ? 'text-white hover:bg-white/10' : 'text-navy-900 hover:bg-slate-100'}`}>Sign in</Link>
            <Link href="/start" className="btn-primary">Apply now</Link>
          </>)}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-navy-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
        <div><Logo light /><p className="mt-3 text-sm text-slate-400">Quick loans, flexible repayments. Borrow responsibly — only what you can afford to repay.</p></div>
        <div className="text-sm"><div className="mb-2 font-bold text-white">Company</div>
          <p>Machonisa Quick Loans</p><p>NCR Registered Credit Provider NCRCP[number]</p><p>Reg. no. [company registration]</p></div>
        <div className="text-sm"><div className="mb-2 font-bold text-white">Get in touch</div>
          <p>support@[your-domain]</p><p>[support phone]</p>
          <p className="mt-3"><Link className="underline" href="/login">Sign in</Link> · <Link className="underline" href="/register">Register</Link></p></div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} Machonisa. All rights reserved.</div>
    </footer>
  );
}

export function AuthFrame({ title, sub, children, foot }: { title: string; sub: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-grad-deep p-12 text-white lg:block">
        <Link href="/"><Logo light /></Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/auth.svg" alt="" className="mx-auto mt-16 w-full max-w-md" />
        <h2 className="mt-10 text-3xl font-extrabold !text-white">Fast loans. Clear costs.</h2>
        <p className="mt-2 max-w-md text-slate-300">Apply in minutes, see every fee upfront, and repay on your terms.</p>
      </aside>
      <section className="flex items-center justify-center bg-white px-5 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-1 mb-7 text-sm text-slate-500">{sub}</p>
          {children}
          {foot && <div className="mt-6 text-center text-sm text-slate-500">{foot}</div>}
        </div>
      </section>
    </main>
  );
}
