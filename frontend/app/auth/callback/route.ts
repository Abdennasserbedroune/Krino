import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ── Allowlist of safe post-login redirect paths ──────────────────────────────
// NEVER redirect to an arbitrary `next` param — that's an open redirect vuln.
const ALLOWED_NEXT_PATHS = [
  '/dashboard/seeker',
  '/dashboard/recruiter',
  '/dashboard',
]

function isSafeNext(next: string | null): next is string {
  if (!next) return false
  return ALLOWED_NEXT_PATHS.some(p => next.startsWith(p))
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // ── 1. No code in URL → something went wrong with OAuth ─────────────────
  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }

  // ── 2. Exchange code for session (PKCE — happens server-side only) ───────
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession error:', error?.message)
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }

  // ── 3. Read the pending role the user selected BEFORE the OAuth redirect ─
  //   This was stored in a short-lived cookie by the register/login page.
  //   It is NEVER read from the URL (prevents role spoofing via crafted links).
  const pendingRole = request.cookies.get('pending_oauth_role')?.value
  const VALID_ROLES = ['seeker', 'recruiter'] as const
  type Role = typeof VALID_ROLES[number]

  // ── 4. Check if a profile already exists for this user ──────────────────
  const { data: existing } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', data.user.id)
    .maybeSingle()

  let finalRole: Role = 'seeker'

  if (existing) {
    // Returning Google user — use the role already in the DB
    finalRole = VALID_ROLES.includes(existing.role as Role)
      ? (existing.role as Role)
      : 'seeker'
  } else {
    // New Google user — use the pending role they chose on the register page
    if (pendingRole && VALID_ROLES.includes(pendingRole as Role)) {
      finalRole = pendingRole as Role
    }

    // Create their profile row
    const { error: upsertError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email ?? '',
      full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? '',
      role: finalRole,
      plan: 'free',
    })

    if (upsertError) {
      // Profile already exists (race condition) — fetch role from DB
      const { data: existingFallback } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()
      if (existingFallback?.role && VALID_ROLES.includes(existingFallback.role as Role)) {
        finalRole = existingFallback.role as Role
      }
    }
  }

  // ── 5. Clear the pending role cookie (one-time use) ──────────────────────
  const response = NextResponse.redirect(
    `${origin}${finalRole === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/seeker'}`
  )
  response.cookies.set('pending_oauth_role', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  return response
}
