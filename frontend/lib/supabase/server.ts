import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client for Route Handlers and Server Components.
 * Reads/writes the session from HTTP-only cookies — never localStorage.
 *
 * Two usage patterns supported:
 *
 * 1. Async factory (new code — preferred):
 *    import { createSupabaseServerClient } from '@/lib/supabase/server'
 *    const supabase = await createSupabaseServerClient()
 *
 * 2. Named createClient export (matches pattern used by existing API routes):
 *    import { createClient } from '@/lib/supabase/server'
 *    const supabase = createClient()
 *
 * Both patterns produce a correctly cookie-backed server client.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      '[Pathwise] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to your .env.local and Vercel environment variables.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — safe to ignore.
          // Middleware will refresh the session cookie.
        }
      },
    },
  })
}

/**
 * Synchronous factory alias — matches the `createClient()` import pattern
 * used by all existing API routes in this codebase.
 *
 * Note: cookies() in Next.js 14+ returns a synchronous store inside
 * Route Handlers (where it's always called), so this works correctly.
 * For Server Components use createSupabaseServerClient() (async) instead.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // cookies() is sync-compatible inside Route Handlers in Next.js 14
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies: syncCookies } = require('next/headers')
  const cookieStore = syncCookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: object }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Safe to ignore in Server Components
        }
      },
    },
  })
}
