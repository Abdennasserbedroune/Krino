import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require a valid session
const PROTECTED_PREFIXES = ['/dashboard']

// Role → home page after login
const ROLE_HOME: Record<string, string> = {
  seeker:    '/dashboard',
  recruiter: '/dashboard/recruiter',
}

// Role → allowed path prefix (used to prevent cross-role access)
const ROLE_PATHS: Record<string, string> = {
  seeker:    '/dashboard',
  recruiter: '/dashboard/recruiter',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Pass-through: static assets, api routes, auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 2. Only protect dashboard routes
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // 3. Build response we can attach refreshed cookies to
  let response = NextResponse.next({ request: { headers: request.headers } })

  // 4. Create server-side Supabase client
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

  // 5. Verify session server-side
  const { data: { user } } = await supabase.auth.getUser()

  // 6. No session → redirect to login
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 7. Fetch role from DB
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: string = profile?.role ?? 'seeker'
  const home = ROLE_HOME[role] ?? '/dashboard'

  // 8. /dashboard (bare) with recruiter role → send to recruiter home
  //    Seeker stays on /dashboard — that IS their home, no redirect needed
  if ((pathname === '/dashboard' || pathname === '/dashboard/') && role === 'recruiter') {
    return NextResponse.redirect(new URL(home, request.url))
  }

  // 9. Recruiter trying to access /dashboard (seeker area) → redirect to recruiter home
  if (role === 'recruiter' && !pathname.startsWith('/dashboard/recruiter')) {
    return NextResponse.redirect(new URL(home, request.url))
  }

  // 10. Seeker trying to access /dashboard/recruiter → redirect to seeker home
  if (role === 'seeker' && pathname.startsWith('/dashboard/recruiter')) {
    return NextResponse.redirect(new URL(home, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
