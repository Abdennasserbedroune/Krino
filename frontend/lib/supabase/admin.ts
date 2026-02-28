/**
 * Server-only Supabase admin client.
 * Uses the service-role key which bypasses Row Level Security.
 * NEVER import this in client components or expose it to the browser.
 *
 * Usage: only in Next.js route handlers after you have already
 * verified ownership with the user's own session.
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Fallback to anon key if service role key is not configured.
    // Delete will still fail if RLS blocks it, but at least the
    // error message will be clearer in the logs.
    console.warn(
      "[admin] SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Falling back to anon key — DELETE may fail if RLS blocks it. " +
      "Add SUPABASE_SERVICE_ROLE_KEY to your environment variables."
    );
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
