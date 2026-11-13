import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const CUSTOMER = ['/dashboard', '/apply', '/applications', '/loans', '/history', '/documents', '/profile'];

export async function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set('x-pathname', req.nextUrl.pathname);
  let res = NextResponse.next({ request: { headers } });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        const h2 = new Headers(headers);
        h2.set('cookie', req.cookies.toString());
        res = NextResponse.next({ request: { headers: h2 } });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const p = req.nextUrl.pathname;
  const protectedPath = p.startsWith('/admin') || CUSTOMER.some((c) => p === c || p.startsWith(c + '/'));
  if (protectedPath && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', p);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|img/|logo.*\\.svg).*)'] };
