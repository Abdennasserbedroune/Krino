import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter
// Edge-compatible (no Node APIs). Resets on cold start — good enough for
// Edge/Serverless. Replace with @upstash/ratelimit + Redis for multi-region.
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX = 10       // max requests
const RATE_LIMIT_WINDOW = 10_000 // per 10 seconds (ms)

const AUTH_RATE_LIMITED_PATHS = [
  '/api/auth',
  '/auth/signin',
  '/auth/register',
  '/auth/login',
]

function getRateLimitKey(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  return ip
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }

  entry.count += 1
  if (entry.count > RATE_LIMIT_MAX) return true

  return false
}

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

  // 1. Rate-limit auth endpoints before any other processing
  const isAuthPath = AUTH_RATE_LIMITED_PATHS.some(p => pathname.startsWith(p))
  if (isAuthPath) {
    const key = getRateLimitKey(request)
    if (isRateLimited(key)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '10',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Window': '10s',
          },
        }
      )
    }
  }

  // 2. Pass-through: static assets, api routes, auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 3. Only protect dashboard routes
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // 4. Build response we can attach refreshed cookies to
  let response = NextResponse.next({ request: { headers: request.headers } })

  // 5. Create server-side Supabase client
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

  // 6. Verify session server-side
  const { data: { user } } = await supabase.auth.getUser()

  // 7. No session → redirect to login
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 8. Fetch role from DB
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: string = profile?.role ?? 'seeker'
  const home = ROLE_HOME[role] ?? '/dashboard'

  // 9. /dashboard (bare) with recruiter role → send to recruiter home
  if ((pathname === '/dashboard' || pathname === '/dashboard/') && role === 'recruiter') {
    return NextResponse.redirect(new URL(home, request.url))
  }

  // 10. Recruiter trying to access /dashboard (seeker area) → redirect to recruiter home
  if (role === 'recruiter' && !pathname.startsWith('/dashboard/recruiter')) {
    return NextResponse.redirect(new URL(home, request.url))
  }

  // 11. Seeker trying to access /dashboard/recruiter → redirect to seeker home
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
