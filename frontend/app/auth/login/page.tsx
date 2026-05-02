'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#111827"/>
    <path d="M7 14h14M14 7l7 7-7 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSeeker = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconRecruiter = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
);
const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

// ─── Error mapper ─────────────────────────────────────────────────────────────
function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password'))
    return 'Wrong email or password. Please check your details and try again.';
  if (m.includes('email not confirmed'))
    return 'Please verify your email first. Check your inbox for a confirmation link.';
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Too many attempts. Please wait a few minutes before trying again.';
  if (m.includes('user not found') || m.includes('no user'))
    return 'No account found with this email. Would you like to create one?';
  if (m.includes('network') || m.includes('fetch'))
    return 'Connection error. Please check your internet and try again.';
  return `Sign-in failed: ${msg}`;
}

type Role = 'seeker' | 'recruiter';

// ─── Card — outside LoginPage to avoid hydration mismatch ────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative', zIndex: 1, width: '100%', maxWidth: 440,
      padding: 1, borderRadius: 32,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)',
    }}>
      <div style={{
        borderRadius: 31, background: '#FFFFFF', padding: '40px 36px 36px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Unverified banner ────────────────────────────────────────────────────────
function UnverifiedBanner({ email, onResend }: { email: string; onResend: () => void }) {
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = () => {
    onResend();
    setResent(true);
    setCooldown(60);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 'calc(100% - 32px)', maxWidth: 520,
      background: '#1c1917', borderRadius: 14,
      boxShadow: '0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.07)',
      padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ marginTop: 2, color: '#f59e0b', flexShrink: 0 }}><IconMail /></div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#f5f5f4', lineHeight: 1.4 }}>Please verify your email</p>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#a8a29e', lineHeight: 1.5 }}>
          We sent a confirmation link to <strong style={{ color: '#e7e5e4' }}>{email}</strong>.
          Unverified accounts are deleted after <strong style={{ color: '#fbbf24' }}>2 days</strong>.
        </p>
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          style={{
            fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: resent ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
            color: resent ? '#4ade80' : '#e7e5e4',
            cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
            opacity: cooldown > 0 ? 0.6 : 1,
            fontFamily: "'Inter', sans-serif",
            transition: 'all 150ms',
          }}
        >
          {resent && cooldown > 0 ? `Sent ✓ — resend in ${cooldown}s` : 'Resend confirmation email'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setStep('form');
    setError(null);
  };

  const handleGoogleSignIn = useCallback(async (role: Role) => {
    setGoogleLoading(true);
    setError(null);
    await fetch('/api/auth/set-pending-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (oauthError) {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }, []);

  const handleResendConfirmation = useCallback(async () => {
    if (!unverifiedEmail) return;
    await supabase.auth.resend({ type: 'signup', email: unverifiedEmail });
  }, [unverifiedEmail]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setUnverifiedEmail(email);
        setLoading(false);
        return;
      }
      setError(mapAuthError(authError.message));
      setLoading(false);
      return;
    }

    // ── Role check: look up the user's stored role ─────────────────────────
    // If no profile row exists yet (race condition / first OAuth login), skip
    // the role gate and just redirect to dashboard — middleware handles the rest.
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user!.id)
      .maybeSingle();

    // If profile exists AND a role was explicitly chosen, enforce the match.
    // If no profile exists yet, let them through — the dashboard will handle setup.
    if (profile && selectedRole && profile.role !== selectedRole) {
      await supabase.auth.signOut();
      setError(
        `This account is registered as a ${
          profile.role === 'recruiter' ? 'Recruiter / HR Team' : 'Job Seeker'
        }. Go back and select the correct role.`
      );
      setLoading(false);
      return;
    }

    const role = profile?.role ?? selectedRole ?? 'seeker';
    router.push(`/dashboard/${role}`);
  }, [email, password, selectedRole, router]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F7F3EF',
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflowX: 'hidden',
    }}>
      {/* backgrounds */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <IconLogo />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Pathwise</span>
        </Link>
      </div>

      {/* Step 1 — Role selection */}
      {step === 'role' && (
        <Card>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Welcome back</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>How are you using Pathwise?</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Seeker */}
            <button
              onClick={() => handleRoleSelect('seeker')}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
                borderRadius: 16, border: '1.5px solid rgba(59,130,246,0.25)',
                background: 'rgba(59,130,246,0.04)', cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'border-color 150ms, background 150ms, transform 150ms',
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconSeeker /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 3 }}>Job Seeker</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Analyse &amp; optimise your resume for ATS</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {/* Recruiter */}
            <button
              onClick={() => handleRoleSelect('recruiter')}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
                borderRadius: 16, border: '1.5px solid rgba(249,115,22,0.25)',
                background: 'rgba(249,115,22,0.04)', cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'border-color 150ms, background 150ms, transform 150ms',
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.background = 'rgba(249,115,22,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'; e.currentTarget.style.background = 'rgba(249,115,22,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(249,115,22,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconRecruiter /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 3 }}>Recruiter / HR Team</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Screen and rank candidates instantly</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div style={{ margin: '24px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>New to Pathwise?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }} />
          </div>
          <Link
            href="/auth/register"
            style={{
              marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 44, borderRadius: 9999, border: '1.5px solid rgba(17,24,39,0.14)',
              color: '#374151', fontSize: 14, fontWeight: 500, textDecoration: 'none',
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.32)'; (e.currentTarget as HTMLElement).style.color = '#111827'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.14)'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
          >Create an account</Link>
        </Card>
      )}

      {/* Step 2 — Email/password form */}
      {step === 'form' && selectedRole && (
        <Card>
          <button
            onClick={() => { setStep('role'); setError(null); setUnverifiedEmail(null); }}
            style={{
              marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#6B7280', padding: 0, fontFamily: "'Inter', sans-serif",
              transition: 'color 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>

          {/* Role badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
            background: selectedRole === 'seeker' ? 'rgba(59,130,246,0.06)' : 'rgba(249,115,22,0.06)',
            border: `1px solid ${selectedRole === 'seeker' ? 'rgba(59,130,246,0.20)' : 'rgba(249,115,22,0.20)'}`,
            marginBottom: 28,
          }}>
            {selectedRole === 'seeker' ? <IconSeeker /> : <IconRecruiter />}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedRole === 'seeker' ? 'Job Seeker' : 'Recruiter / HR Team'}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Signing in as {selectedRole}</div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Welcome back</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>Sign in to your Pathwise account</p>
          </div>

          {/* Google */}
          <button
            onClick={() => handleGoogleSignIn(selectedRole)}
            disabled={googleLoading}
            style={{
              width: '100%', height: 44, borderRadius: 9999,
              border: '1.5px solid rgba(17,24,39,0.14)', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer',
              transition: 'border-color 150ms, transform 150ms',
              fontFamily: "'Inter', sans-serif",
              opacity: googleLoading ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!googleLoading) { e.currentTarget.style.borderColor = 'rgba(17,24,39,0.32)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(17,24,39,0.14)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <IconGoogle />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }} />
          </div>

          {/* Unverified inline notice */}
          {unverifiedEmail && (
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
              fontSize: 13, color: '#92400e', lineHeight: 1.6, marginBottom: 16,
            }}>
              📧 A confirmation email was sent to <strong>{unverifiedEmail}</strong>. Please verify your email to sign in.
              <button
                onClick={handleResendConfirmation}
                style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Inter', sans-serif", textDecoration: 'underline' }}
              >Resend confirmation email</button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="login-email" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Email</label>
              <input
                id="login-email" type="email" required placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={{
                  height: 44, width: '100%', padding: '0 14px', borderRadius: 12,
                  border: `1.5px solid ${error ? 'rgba(239,68,68,0.40)' : 'rgba(17,24,39,0.14)'}`,
                  background: 'rgba(17,24,39,0.02)', fontSize: 14,
                  fontFamily: "'Inter', sans-serif", color: '#111827', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = selectedRole === 'recruiter' ? '#f97316' : '#3b82f6'; e.currentTarget.style.background = selectedRole === 'recruiter' ? 'rgba(249,115,22,0.04)' : 'rgba(59,130,246,0.04)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.40)' : 'rgba(17,24,39,0.14)'; e.currentTarget.style.background = 'rgba(17,24,39,0.02)'; }}
              />
            </div>
            {/* Password field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
                >Forgot password?</Link>
              </div>
              <input
                id="login-password" type="password" required placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  height: 44, width: '100%', padding: '0 14px', borderRadius: 12,
                  border: '1.5px solid rgba(17,24,39,0.14)',
                  background: 'rgba(17,24,39,0.02)', fontSize: 14,
                  fontFamily: "'Inter', sans-serif", color: '#111827', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = selectedRole === 'recruiter' ? '#f97316' : '#3b82f6'; e.currentTarget.style.background = selectedRole === 'recruiter' ? 'rgba(249,115,22,0.04)' : 'rgba(59,130,246,0.04)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(17,24,39,0.14)'; e.currentTarget.style.background = 'rgba(17,24,39,0.02)'; }}
              />
            </div>

            {/* Error box */}
            {error && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', fontSize: 13, color: '#dc2626', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, height: 48, width: '100%', borderRadius: 9999,
                color: '#fff', fontSize: 15, fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? 'rgba(17,24,39,0.45)' : (selectedRole === 'recruiter' ? '#f97316' : '#111827'),
                boxShadow: 'rgba(0,0,0,0.4) 0px 12px 24px -6px',
                transition: 'opacity 150ms, transform 150ms',
                fontFamily: "'Inter', sans-serif",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <IconArrowRight />}
            </button>
          </form>
        </Card>
      )}

      {/* Unverified floating banner */}
      {unverifiedEmail && step === 'form' && (
        <UnverifiedBanner email={unverifiedEmail} onResend={handleResendConfirmation} />
      )}

      <p style={{ position: 'relative', zIndex: 1, marginTop: 28, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
        Protected by Supabase Auth &amp; PKCE. No passwords stored in plain text.
      </p>
    </div>
  );
}
