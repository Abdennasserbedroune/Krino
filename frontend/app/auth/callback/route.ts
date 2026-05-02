import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
  const code        = searchParams.get('code')          // PKCE OAuth flow
  const token_hash  = searchParams.get('token_hash')    // Email OTP / magic-link
  const type        = searchParams.get('type')          // 'signup' | 'recovery' | 'email'
  const next        = searchParams.get('next')

  const supabase = await createSupabaseServerClient()

  // ── A. Email confirmation / magic-link / password-recovery (token_hash) ──
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })

    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message)
      return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
    }

    // Password-recovery token: send user to the reset page so they can set a
    // new password. The session is now active server-side so the page will
    // detect it via getSession() and unlock the form immediately.
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/reset-password`)
    }

    // Email-confirm or magic-link: route to the right dashboard
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/auth/login`)

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role === 'recruiter' ? 'recruiter' : 'seeker'
    const destination = isSafeNext(next) ? next : `/dashboard/${role}`
    return NextResponse.redirect(`${origin}${destination}`)
  }

  // ── B. OAuth PKCE code exchange (Google etc.) ─────────────────────────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user) {
      console.error('[auth/callback] exchangeCodeForSession error:', error?.message)
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }

    const pendingRole = request.cookies.get('pending_oauth_role')?.value
    const VALID_ROLES = ['seeker', 'recruiter'] as const
    type Role = typeof VALID_ROLES[number]

    const { data: existing } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', data.user.id)
      .maybeSingle()

    let finalRole: Role = 'seeker'

    if (existing) {
      finalRole = VALID_ROLES.includes(existing.role as Role) ? (existing.role as Role) : 'seeker'
    } else {
      if (pendingRole && VALID_ROLES.includes(pendingRole as Role)) {
        finalRole = pendingRole as Role
      }
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email ?? '',
        full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? '',
        role: finalRole,
        plan: 'free',
      })
    }

    const response = NextResponse.redirect(
      `${origin}/dashboard/${finalRole === 'recruiter' ? 'recruiter' : 'seeker'}`
    )
    response.cookies.set('pending_oauth_role', '', {
      maxAge: 0, path: '/', httpOnly: true,
      secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    })
    return response
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}
