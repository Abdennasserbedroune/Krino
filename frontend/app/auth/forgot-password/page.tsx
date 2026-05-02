'use client';

import { useState } from 'react';
import Link from 'next/link';
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

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F3EF', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflowX: 'hidden' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .fp-input { height: 44px; width: 100%; padding: 0 14px; border-radius: 12px; border: 1.5px solid rgba(17,24,39,0.14); background: rgba(17,24,39,0.02); font-size: 14px; font-family: 'Inter', sans-serif; color: #111827; outline: none; transition: border-color 150ms ease; }
        .fp-input::placeholder { color: #9CA3AF; }
        .fp-input:focus { border-color: #111827; background: rgba(17,24,39,0.03); }
        .fp-btn { height: 48px; width: 100%; border-radius: 9999px; background: #111827; color: #fff; font-size: 15px; font-weight: 500; border: none; cursor: pointer; transition: opacity 150ms, transform 150ms; font-family: 'Inter', sans-serif; }
        .fp-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .fp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <IconLogo />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Pathwise</span>
        </Link>
      </div>

      <Card>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Check your inbox</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
              We sent a password reset link to <strong style={{ color: '#111827' }}>{email}</strong>.
              It expires in 10 minutes.
            </p>
            <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 9999, background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Back to Sign in
            </Link>
          </div>
        ) : (
          <>
            <Link href="/auth/login"
              style={{ marginBottom: 28, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Back to Sign in
            </Link>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Forgot your password?</h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="fp-email" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Email address</label>
                <input id="fp-email" type="email" required placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="fp-input" autoComplete="email" />
              </div>
              {error && (
                <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="fp-btn">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </Card>

      <p style={{ position: 'relative', zIndex: 1, marginTop: 28, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
        Remembered it? <Link href="/auth/login" style={{ color: '#6B7280', textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  );
}
