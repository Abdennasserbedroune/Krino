'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Wrong email or password. Please try again.'
        : authError.message);
      setLoading(false);
      return;
    }
    router.push('/dashboard');
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#F7F3EF',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Warm radial glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)',
      }}/>
      {/* Grid overlay */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: [
          'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px)',
          'linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '48px 48px',
      }}/>

      {/* Logo top */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <IconLogo/>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Pathwise</span>
        </Link>
      </div>

      {/* Card */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          padding: 1,
          borderRadius: 32,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)',
        }}
      >
        <div
          style={{
            borderRadius: 31,
            background: '#FFFFFF',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)',
            padding: '40px 36px 36px',
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Welcome back</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280', fontWeight: 400, lineHeight: 1.6 }}>
              Sign in to your Pathwise account
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                style={{
                  height: 44, width: '100%',
                  padding: '0 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${focusedField === 'email' ? '#111827' : 'rgba(17,24,39,0.14)'}`,
                  background: 'rgba(17,24,39,0.02)',
                  fontSize: 14, color: '#111827',
                  outline: 'none',
                  transition: 'border-color 150ms ease',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
                <Link href="#" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none', transition: 'color 150ms' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = '#111827'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = '#6B7280'}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  height: 44, width: '100%',
                  padding: '0 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${focusedField === 'password' ? '#111827' : 'rgba(17,24,39,0.14)'}`,
                  background: 'rgba(17,24,39,0.02)',
                  fontSize: 14, color: '#111827',
                  outline: 'none',
                  transition: 'border-color 150ms ease',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.20)',
                fontSize: 13,
                color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                height: 48,
                width: '100%',
                borderRadius: 9999,
                background: loading ? 'rgba(17,24,39,0.5)' : '#111827',
                color: '#FFFFFF',
                fontSize: 15, fontWeight: 500,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: 'rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px',
                transition: 'opacity 150ms ease, transform 150ms ease',
              }}
              onMouseEnter={e => !loading && ((e.currentTarget.style.transform = 'translateY(-1px)'))}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <IconArrowRight/>}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            margin: '28px 0 0',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>New to Pathwise?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
          </div>

          <Link
            href="/auth/register"
            style={{
              marginTop: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 44,
              borderRadius: 9999,
              border: '1.5px solid rgba(17,24,39,0.14)',
              color: '#374151',
              fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
              transition: 'border-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.32)'; (e.currentTarget as HTMLElement).style.color = '#111827'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.14)'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
          >
            Create an account
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ position: 'relative', zIndex: 1, marginTop: 28, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
        Protected by Supabase Auth. No passwords stored in plain text.
      </p>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
}
