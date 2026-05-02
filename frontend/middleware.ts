import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require a valid session
const PROTECTED_PREFIXES = ['/dashboard']

// Role → allowed path prefix
const ROLE_PATHS: Record<string, string> = {
  seeker: '/dashboard/seeker',
  recruiter: '/dashboard/recruiter',
}

// Supabase dashboard root (no sub-path) redirects
const ROLE_HOME: Record<string, string> = {
  seeker: '/dashboard/seeker',
  recruiter: '/dashboard/recruiter',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Pass-through: static assets, api routes, auth routes ─────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ── 2. Only protect dashboard routes ────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // ── 3. Build a response we can attach refreshed cookies to ──────────────
  let response = NextResponse.next({ request: { headers: request.headers } })

  // ── 4. Create server-side Supabase client (reads session from cookies) ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── 5. Get session — never trust client-side state ──────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  // ── 6. No session → kick to login ───────────────────────────────────────
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 7. Fetch role from DB (source of truth, not user_metadata) ──────────
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: string = profile?.role ?? 'seeker'

  // ── 8. /dashboard (bare) → redirect to role home ────────────────────────
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/dashboard/seeker', request.url))
  }

  // ── 9. Role-based path enforcement ──────────────────────────────────────
  //   A seeker trying /dashboard/recruiter/* → redirect to their home
  //   A recruiter trying /dashboard/seeker/* → redirect to their home
  const allowedPrefix = ROLE_PATHS[role]
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public folder files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
