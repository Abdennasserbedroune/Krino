import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * Server-side Supabase client for Route Handlers and Server Components.
 * Reads/writes the session from HTTP-only cookies — never localStorage.
 * Use this in: app/auth/callback/route.ts, server actions, etc.
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

  return createServerClient<Database>(url, key, {
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
          // setAll is called from a Server Component — ignore the error.
          // The middleware will refresh the session cookie regardless.
        }
      },
    },
  })
}
