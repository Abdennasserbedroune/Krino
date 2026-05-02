import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    '[Pathwise] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Add them to your .env.local and Vercel project settings.'
  )
}

/**
 * Browser-side Supabase client — two usage patterns supported:
 *
 * 1. Singleton (used in login/register pages added in this PR):
 *    import { supabase } from '@/lib/supabase/client'
 *
 * 2. Factory (used by all existing hooks and components):
 *    import { createClient } from '@/lib/supabase/client'
 *    const supabase = createClient()
 *
 * Both return the same underlying client. Session is stored in cookies
 * managed by @supabase/ssr — never in localStorage.
 */
export function createClient() {
  return createBrowserClient(url!, key!)
}

// Singleton alias for convenience in new code
export const supabase = createClient()
