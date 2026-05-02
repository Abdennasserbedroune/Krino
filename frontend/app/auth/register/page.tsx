'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Role = 'seeker' | 'recruiter';

const ACCENT = {
  seeker:    { color: '#3b82f6', soft: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.22)' },
  recruiter: { color: '#f97316', soft: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.22)'  },
};

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

const IconCheck = ({ color = '#22c55e' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 7l3 3 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const planParam = params.get('plan');

  const [role, setRole] = useState<Role>('seeker');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // pill indicator
  const pillRef = useRef<HTMLDivElement>(null);
  const seekerRef = useRef<HTMLButtonElement>(null);
  const recruiterRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const accent = ACCENT[role];

  const recalcIndicator = () => {
    const btn = role === 'seeker' ? seekerRef.current : recruiterRef.current;
    const pill = pillRef.current;
    if (!btn || !pill) return;
    const b = btn.getBoundingClientRect();
    const p = pill.getBoundingClientRect();
    setIndicator({ left: b.left - p.left, width: b.width });
  };

  useEffect(() => { recalcIndicator(); }, [role]);
  useEffect(() => {
    // initial position on mount
    setTimeout(recalcIndicator, 50);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    // 1. Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Upsert profile row in users table
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        full_name: name,
        role,
        plan: planParam ?? 'free',
      });
    }

    // 3. If session exists immediately (email confirm disabled) → go to dashboard
    //    Otherwise show success message
    if (data.session) {
      router.push('/dashboard');
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F7F3EF',
        fontFamily: "'Inter', sans-serif",
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        position: 'relative',
      }}>
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)',
        }}/>
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          padding: 1, borderRadius: 32,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)',
        }}>
          <div style={{
            borderRadius: 31, background: '#FFFFFF', padding: '48px 36px',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <IconCheck color="#22c55e"/>
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Check your inbox</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
              We sent a confirmation link to <strong style={{ color: '#111827' }}>{email}</strong>.<br/>
              Click it to activate your account and go to your dashboard.
            </p>
            <Link
              href="/auth/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '11px 24px', borderRadius: 9999,
                background: '#111827', color: '#fff',
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}
            >
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#F7F3EF',
        fontFamily: "'Inter', sans-serif",
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Glows */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)',
      }}/>
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: [
          'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px)',
          'linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '48px 48px',
      }}/>

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 32, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <IconLogo/>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Pathwise</span>
        </Link>
      </div>

      {/* Role toggle pill — ABOVE the card */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          marginBottom: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 400 }}>I am signing up as a…</p>
        <div
          ref={pillRef}
          style={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(17,24,39,0.10)',
            borderRadius: 9999,
            padding: 4,
            boxShadow: '0 1px 4px rgba(17,24,39,0.06)',
          }}
          role="group"
          aria-label="Select account type"
        >
          {/* Animated pill indicator */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 4, height: 'calc(100% - 8px)',
              borderRadius: 9999,
              background: accent.color,
              left: indicator.left,
              width: indicator.width,
              transition: 'left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1), background 300ms ease',
              zIndex: 0,
              boxShadow: `0 2px 8px ${accent.color}44`,
            }}
          />
          <button
            ref={seekerRef}
            onClick={() => setRole('seeker')}
            aria-pressed={role === 'seeker'}
            style={{
              position: 'relative', zIndex: 1,
              padding: '8px 20px', borderRadius: 9999,
              fontSize: 13, fontWeight: 500,
              color: role === 'seeker' ? '#fff' : '#6B7280',
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'color 200ms ease', whiteSpace: 'nowrap',
            }}
          >Job Hunter</button>
          <button
            ref={recruiterRef}
            onClick={() => setRole('recruiter')}
            aria-pressed={role === 'recruiter'}
            style={{
              position: 'relative', zIndex: 1,
              padding: '8px 20px', borderRadius: 9999,
              fontSize: 13, fontWeight: 500,
              color: role === 'recruiter' ? '#fff' : '#6B7280',
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'color 200ms ease', whiteSpace: 'nowrap',
            }}
          >HR Teams</button>
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          padding: 1, borderRadius: 32,
          background: role === 'seeker'
            ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(255,255,255,0.92) 60%, rgba(17,24,39,0.07) 100%)'
            : 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(255,255,255,0.92) 60%, rgba(17,24,39,0.07) 100%)',
          transition: 'background 300ms ease',
        }}
      >
        <div
          style={{
            borderRadius: 31,
            background: '#FFFFFF',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)',
            padding: '36px 36px 32px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Subtle corner glow per role */}
          <div aria-hidden style={{
            position: 'absolute', top: '-30%', right: '-10%',
            width: 220, height: 220, borderRadius: '50%',
            background: `radial-gradient(circle, ${accent.color}14 0%, transparent 70%)`,
            pointerEvents: 'none',
            transition: 'background 300ms ease',
          }}/>

          <div style={{ marginBottom: 28, position: 'relative' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>
              Create your account
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280', fontWeight: 400, lineHeight: 1.6 }}>
              {role === 'seeker'
                ? 'Start optimising your resume and tracking jobs.'
                : 'Start screening candidates and building your pipeline.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>

            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Full name</label>
              <input
                type="text"
                required
                placeholder="Abdennasser Bedroune"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                style={{
                  height: 44, width: '100%', padding: '0 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${focusedField === 'name' ? accent.color : 'rgba(17,24,39,0.14)'}`,
                  background: 'rgba(17,24,39,0.02)',
                  fontSize: 14, color: '#111827',
                  outline: 'none', transition: 'border-color 150ms ease',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
                  height: 44, width: '100%', padding: '0 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${focusedField === 'email' ? accent.color : 'rgba(17,24,39,0.14)'}`,
                  background: 'rgba(17,24,39,0.02)',
                  fontSize: 14, color: '#111827',
                  outline: 'none', transition: 'border-color 150ms ease',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  height: 44, width: '100%', padding: '0 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${focusedField === 'password' ? accent.color : 'rgba(17,24,39,0.14)'}`,
                  background: 'rgba(17,24,39,0.02)',
                  fontSize: 14, color: '#111827',
                  outline: 'none', transition: 'border-color 150ms ease',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.20)',
                fontSize: 13, color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6, height: 48, width: '100%',
                borderRadius: 9999,
                background: loading ? `${accent.color}88` : accent.color,
                color: '#FFFFFF',
                fontSize: 15, fontWeight: 500,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: `rgba(0,0,0,0.25) 0px 8px 20px -6px, ${accent.color}44 0px 0px 0px 1px`,
                transition: 'opacity 150ms ease, transform 150ms ease, background 300ms ease',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? 'Creating account...' : (role === 'seeker' ? 'Start as Job Hunter' : 'Start as HR Teams')}
              {!loading && <IconArrowRight/>}
            </button>
          </form>

          {/* Divider + login link */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Already have an account?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
          </div>
          <Link
            href="/auth/login"
            style={{
              marginTop: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 44, borderRadius: 9999,
              border: '1.5px solid rgba(17,24,39,0.14)',
              color: '#374151', fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
              transition: 'border-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.32)'; (e.currentTarget as HTMLElement).style.color = '#111827'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.14)'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
          >
            Sign in instead
          </Link>
        </div>
      </div>

      <p style={{ position: 'relative', zIndex: 1, marginTop: 24, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
        By signing up you agree to our{' '}
        <Link href="#" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</Link>{' '}and{' '}
        <Link href="#" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy Policy</Link>.
      </p>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
}
