import { NextRequest, NextResponse } from 'next/server'

const VALID_ROLES = ['seeker', 'recruiter'] as const
type Role = typeof VALID_ROLES[number]

/**
 * POST /api/auth/set-pending-role
 *
 * Sets an httpOnly, SameSite=lax, Secure cookie containing the role the user
 * selected BEFORE being redirected to Google OAuth.
 *
 * Why a server route instead of document.cookie?
 * - httpOnly = JavaScript cannot read or modify this cookie (XSS-proof)
 * - The callback route /auth/callback reads it server-side only
 * - Cookie expires in 10 minutes — one-time use
 * - Role is validated against an allowlist here before being stored
 */
export async function POST(request: NextRequest) {
  let role: string

  try {
    const body = await request.json()
    role = body?.role
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Strict allowlist — reject anything that isn't exactly these two values
  if (!VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })

  response.cookies.set('pending_oauth_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes — enough for the OAuth round-trip
  })

  return response
}
