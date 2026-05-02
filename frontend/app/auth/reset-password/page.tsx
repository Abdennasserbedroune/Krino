'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const IconLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#111827"/>
    <path d="M7 14h14M14 7l7 7-7 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative', zIndex: 1, width: '100%', maxWidth: 440,
      padding: 1, borderRadius: 32,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)',
    }}>
      <div style={{
        borderRadius: 31, background: '#FFFFFF', padding: '40px 36px 36px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)',
      }}>
        {children}
      </div>
    </div>
  );
}

function passwordValid(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
}

function PasswordHints({ password }: { password: string }) {
  const checks = [
    { label: 'Uppercase',     ok: /[A-Z]/.test(password) },
    { label: 'Lowercase',     ok: /[a-z]/.test(password) },
    { label: 'Number',        ok: /[0-9]/.test(password) },
    { label: 'Symbol (!@#…)', ok: /[^A-Za-z0-9]/.test(password) },
    { label: '8+ characters', ok: password.length >= 8 },
  ];
  if (!password || checks.every(c => c.ok)) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 6 }}>
      {checks.map(c => (
        <span key={c.label} style={{ fontSize: 11, color: c.ok ? '#16a34a' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
          {c.ok ? '✓' : '○'} {c.label}
        </span>
      ))}
    </div>
  );
}

type SessionState = 'checking' | 'ready' | 'expired';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('checking');

  useEffect(() => {
    // Strategy 1: listen for the PASSWORD_RECOVERY event (hash-based flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionState('ready');
      } else if (event === 'SIGNED_IN' && session) {
        // Already have a valid session (e.g. user came via callback route)
        setSessionState('ready');
      }
    });

    // Strategy 2: check if there's already an active session right now
    // (covers the case where the callback route exchanged the token server-side
    // and the user already has a valid session cookie)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionState('ready');
      }
    });

    // Strategy 3: time out gracefully — if after 6s still nothing, show expired
    const timeout = setTimeout(() => {
      setSessionState(prev => prev === 'checking' ? 'expired' : prev);
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordValid(password)) {
      setError('Password must be 8+ chars and include uppercase, lowercase, a number and a special character.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Failed to update password. The link may have expired — request a new one below.');
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    height: 44, width: '100%', padding: '0 14px', borderRadius: 12,
    border: '1.5px solid rgba(17,24,39,0.14)', background: 'rgba(17,24,39,0.02)',
    fontSize: 14, fontFamily: "'Inter', sans-serif", color: '#111827', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 150ms ease',
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#F7F3EF', fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflowX: 'hidden',
    }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <IconLogo />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Pathwise</span>
        </Link>
      </div>

      <Card>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 600, color: '#111827' }}>Password updated!</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>Your password has been changed. You can now sign in with your new password.</p>
            <Link
              href="/auth/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '11px 24px', borderRadius: 9999,
                background: '#111827', color: '#fff',
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}
            >Sign in now</Link>
          </div>
        ) : sessionState === 'expired' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 600, color: '#111827' }}>Link expired</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>This password reset link has expired or already been used. Request a new one.</p>
            <Link
              href="/auth/forgot-password"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '11px 24px', borderRadius: 9999,
                background: '#111827', color: '#fff',
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}
            >Request new link</Link>
          </div>
        ) : (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Set a new password</h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Choose a strong password for your Pathwise account.</p>

            {sessionState === 'checking' && (
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 20,
                background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)',
                fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Verifying your reset link…
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="rp-pass" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>New password</label>
                <input
                  id="rp-pass" type="password" required placeholder="e.g. MyPass1@"
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#111827'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(17,24,39,0.14)'; }}
                />
                <PasswordHints password={password} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="rp-confirm" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Confirm password</label>
                <input
                  id="rp-confirm" type="password" required placeholder="Repeat your password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#111827'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(17,24,39,0.14)'; }}
                />
                {confirm && password !== confirm && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Passwords do not match</span>
                )}
              </div>
              {error && (
                <div role="alert" style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)',
                  fontSize: 13, color: '#dc2626',
                }}>
                  {error}
                  {error.includes('expired') && (
                    <Link href="/auth/forgot-password" style={{ display: 'block', marginTop: 6, color: '#dc2626', fontWeight: 600 }}>
                      → Request a new reset link
                    </Link>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || sessionState === 'checking'}
                style={{
                  height: 48, width: '100%', borderRadius: 9999,
                  background: loading || sessionState === 'checking' ? 'rgba(17,24,39,0.45)' : '#111827',
                  color: '#fff', fontSize: 15, fontWeight: 500, border: 'none',
                  cursor: loading || sessionState === 'checking' ? 'not-allowed' : 'pointer',
                  transition: 'opacity 150ms, transform 150ms',
                  fontFamily: "'Inter', sans-serif",
                  opacity: loading || sessionState === 'checking' ? 0.55 : 1,
                }}
                onMouseEnter={e => { if (!loading && sessionState !== 'checking') e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {loading ? 'Updating…' : sessionState === 'checking' ? 'Verifying link…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#F7F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#9CA3AF' }}>Loading…</div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
