import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Immediately bypass static assets, manifest, sitemap, robots, icons to prevent infinite loops
  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/_next') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt|xml|js|json|html|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Server-to-server webhooks (Meta, Razorpay) and public marketing pages
  // never need a Supabase session. Skipping the auth round-trip here
  // removes ~100–300 ms from every inbound WhatsApp webhook and every
  // marketing page view.
  if (!needsSession(pathname)) {
    const headers = new Headers(request.headers);
    headers.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers } });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifies the JWT locally (cached JWKS) when the project
  // uses asymmetric signing keys and only falls back to the Auth server
  // otherwise. It still refreshes an expired session (rotating cookies
  // through setAll above), so it's a drop-in, faster replacement for
  // getUser() in middleware.
  const user = await resolveUser(supabase);

  const withRefreshedCookies = <T extends NextResponse>(response: T): T => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  };

  // 1. Strict SuperAdmin Route Protection
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/superadmin');
  const isAdminLoginRoute = pathname === '/admin/login' || pathname === '/superadmin/login';
  const isAdminAuthApi = pathname.startsWith('/api/admin/auth');

  if (isAdminRoute && !isAdminLoginRoute && !isAdminAuthApi) {
    const adminToken = request.cookies.get('wacrm_superadmin_session')?.value;
    if (!adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  if (isAdminLoginRoute) {
    const adminToken = request.cookies.get('wacrm_superadmin_session')?.value;
    if (adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  // 2. Client User Auth pages
  if (user && (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone();
    const inviteToken = request.nextUrl.searchParams.get('invite');
    if (inviteToken) {
      url.pathname = `/join/${encodeURIComponent(inviteToken)}`;
      url.search = '';
    } else {
      url.pathname = '/dashboard';
      url.search = '';
    }
    return withRefreshedCookies(NextResponse.redirect(url));
  }

  // 3. Client Dashboard Protected pages
  const protectedPaths = [
    '/dashboard',
    '/inbox',
    '/contacts',
    '/pipelines',
    '/broadcasts',
    '/automations',
    '/flows',
    '/agents',
    '/billing',
    '/notifications',
    '/tools',
    '/settings',
  ];

  if (!user && protectedPaths.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return withRefreshedCookies(NextResponse.redirect(url));
  }

  // 4. API routes that need auth
  if (!user && pathname.startsWith('/api/whatsapp/') && !pathname.includes('/webhook')) {
    return withRefreshedCookies(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
  }

  return supabaseResponse;
}

type AuthLike = {
  auth: {
    getClaims?: () => Promise<{ data: { claims?: { sub?: string } | null } | null; error?: unknown }>;
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
};

async function resolveUser(supabase: unknown): Promise<{ id: string } | null> {
  const client = supabase as AuthLike;
  try {
    if (typeof client.auth.getClaims === 'function') {
      const { data, error } = await client.auth.getClaims();
      if (!error && data?.claims?.sub) return { id: data.claims.sub };
      if (!error) return null;
    }
    const { data } = await client.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

const SESSION_PREFIXES = [
  '/dashboard', '/inbox', '/contacts', '/pipelines', '/broadcasts',
  '/automations', '/flows', '/agents', '/billing', '/notifications',
  '/tools', '/settings', '/bot-reply', '/login', '/signup',
  '/forgot-password', '/reset-password', '/join', '/auth', '/admin',
  '/superadmin', '/api',
];

const SESSIONLESS_API = [
  '/api/whatsapp/webhook',
  '/api/webhooks/',
  '/api/automations/cron',
  '/api/flows/cron',
  '/api/v1/',
];

function needsSession(pathname: string): boolean {
  if (
    SESSIONLESS_API.some((p) =>
      p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return false;
  }
  return SESSION_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|manifest\\.json|sw\\.js|offline\\.html|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|json)$).*)',
  ],
};
