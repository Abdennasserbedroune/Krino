'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const IconLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#111827"/>
    <path d="M7 14h14M14 7l7 7-7 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: 1, borderRadius: 32, background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)' }}>
      <div style={{ borderRadius: 31, background: '#FFFFFF', padding: '40px 36px 36px', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)' }}>
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

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends a recovery token in the URL hash — exchange it for a session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordValid(password)) {
      setError('Password must include uppercase, lowercase, a number and a special character.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Failed to update password. The link may have expired — request a new one.');
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F3EF', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflowX: 'hidden' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .rp-input { height: 44px; width: 100%; padding: 0 14px; border-radius: 12px; border: 1.5px solid rgba(17,24,39,0.14); background: rgba(17,24,39,0.02); font-size: 14px; font-family: 'Inter', sans-serif; color: #111827; outline: none; transition: border-color 150ms ease; }
        .rp-input::placeholder { color: #9CA3AF; }
        .rp-input:focus { border-color: #111827; background: rgba(17,24,39,0.03); }
        .rp-btn { height: 48px; width: 100%; border-radius: 9999px; background: #111827; color: #fff; font-size: 15px; font-weight: 500; border: none; cursor: pointer; transition: opacity 150ms, transform 150ms; font-family: 'Inter', sans-serif; }
        .rp-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .rp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <IconLogo />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Pathwise</span>
        </Link>
      </div>

      <Card>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 600, color: '#111827' }}>Password updated!</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>Your password has been changed. You can now sign in with your new password.</p>
            <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 9999, background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Sign in now
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Set a new password</h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Choose a strong password for your Pathwise account.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="rp-pass" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>New password</label>
                <input id="rp-pass" type="password" required placeholder="e.g. MyPass1@"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="rp-input" autoComplete="new-password" />
                <PasswordHints password={password} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="rp-confirm" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Confirm password</label>
                <input id="rp-confirm" type="password" required placeholder="Repeat your password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="rp-input" autoComplete="new-password" />
                {confirm && password !== confirm && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Passwords do not match</span>
                )}
              </div>
              {error && (
                <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || !sessionReady} className="rp-btn">
                {loading ? 'Updating…' : !sessionReady ? 'Verifying link…' : 'Update password'}
              </button>
              {!sessionReady && (
                <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
                  If this takes too long, your link may have expired.
                  <Link href="/auth/forgot-password" style={{ color: '#6B7280', marginLeft: 4 }}>Request a new one.</Link>
                </p>
              )}
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#F7F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#9CA3AF' }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
