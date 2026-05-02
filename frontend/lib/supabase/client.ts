import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    '[Pathwise] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Add them to your .env.local and Vercel project settings.'
  )
}

/**
 * Browser-side Supabase client — singleton.
 * Session is stored in cookies managed by @supabase/ssr, NOT in localStorage.
 * Import this in Client Components instead of @/lib/supabase.
 */
export const supabase = createBrowserClient<Database>(url, key)
