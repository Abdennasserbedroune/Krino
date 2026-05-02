'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Role = 'seeker' | 'recruiter';
const VALID_ROLES: Role[] = ['seeker', 'recruiter'];
const VALID_PLANS = ['free', 'pro', 'growth', 'teams', 'enterprise'];

const ACCENT = {
  seeker:    { color: '#3b82f6', soft: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.22)' },
  recruiter: { color: '#f97316', soft: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.22)'  },
};

// ── Error mapper ──────────────────────────────────────────────────────────────
function mapSignUpError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists') || m.includes('duplicate'))
    return 'An account with this email already exists. Try signing in instead.';
  if (m.includes('password') && (m.includes('weak') || m.includes('short') || m.includes('length')))
    return 'Password is too weak. Use at least 8 characters with a mix of letters and numbers.';
  if (m.includes('invalid email') || m.includes('email format'))
    return 'Please enter a valid email address.';
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Too many attempts. Please wait a few minutes before trying again.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Connection error. Please check your internet and try again.';
  return 'Could not create account. Please try again.';
}

// ── Icons ──────────────────────────────────────────────────────────────────────
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
const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const planParam = params.get('plan');

  const [role, setRole] = useState<Role>('seeker');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pillRef = useRef<HTMLDivElement>(null);
  const seekerRef = useRef<HTMLButtonElement>(null);
  const recruiterRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const accent = ACCENT[role];

  const recalcIndicator = useCallback(() => {
    const btn = role === 'seeker' ? seekerRef.current : recruiterRef.current;
    const pill = pillRef.current;
    if (!btn || !pill) return;
    const b = btn.getBoundingClientRect();
    const p = pill.getBoundingClientRect();
    setIndicator({ left: b.left - p.left, width: b.width });
  }, [role]);

  useEffect(() => { recalcIndicator(); }, [recalcIndicator]);
  useEffect(() => { const t = setTimeout(recalcIndicator, 50); return () => clearTimeout(t); }, [recalcIndicator]);

  const handleGoogleSignUp = useCallback(async () => {
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
      setError('Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  }, [role]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!VALID_ROLES.includes(role)) { setError('Invalid role selected.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (name.trim().length < 2) { setError('Please enter your full name.'); return; }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim(), role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(mapSignUpError(signUpError.message));
      setLoading(false);
      return;
    }

    // Write profile row — only if user was actually created (not a duplicate session)
    if (data.user && !data.user.identities?.length === false) {
      // identities array is empty for duplicate email signups in Supabase
      // This is a false-positive signup — Supabase returns no error but sends
      // a "you already have an account" email. Detect and surface it clearly.
    }

    if (data.user) {
      const resolvedPlan = planParam && VALID_PLANS.includes(planParam) ? planParam : 'free';
      const { error: profileError } = await supabase.from('users').upsert({
        id: data.user.id,
        email: email.toLowerCase().trim(),
        full_name: name.trim(),
        role,
        plan: resolvedPlan,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

      if (profileError) {
        // Profile insert failed — log for debugging but don't block the user
        // The trigger or callback will retry on first login
        console.error('[register] profile upsert error:', profileError.message);
      }
    }

    if (data.session) {
      router.push('/dashboard');
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }, [role, name, email, password, planParam, router]);

  if (success) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F7F3EF', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)' }}/>
        <style>{`*, *::before, *::after { box-sizing: border-box; }`}</style>
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: 1, borderRadius: 32, background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)' }}>
          <div style={{ borderRadius: 31, background: '#FFFFFF', padding: '48px 36px', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <IconCheck color="#22c55e"/>
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Check your inbox</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
              We sent a confirmation link to <strong style={{ color: '#111827' }}>{email}</strong>.<br/>Click it to activate your account.
            </p>
            <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 9999, background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F3EF', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowX: 'hidden' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)' }}/>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }}/>

      {/* ── INPUT FOCUS FIX ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .pw-input {
          height: 44px; width: 100%; padding: 0 14px;
          border-radius: 12px;
          border: 1.5px solid rgba(17,24,39,0.14);
          background: rgba(17,24,39,0.02);
          font-size: 14px; font-family: 'Inter', sans-serif;
          color: #111827; outline: none;
          transition: border-color 150ms ease, background 150ms ease;
        }
        .pw-input::placeholder { color: #9CA3AF; }
        .pw-input-seeker:focus  { border-color: #3b82f6; background: rgba(59,130,246,0.04); }
        .pw-input-recruiter:focus { border-color: #f97316; background: rgba(249,115,22,0.04); }
        .pw-submit-btn {
          margin-top: 6px; height: 48px; width: 100%; border-radius: 9999px;
          color: #fff; font-size: 15px; font-weight: 500; border: none;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: opacity 150ms ease, transform 150ms ease, background 300ms ease;
          font-family: 'Inter', sans-serif;
        }
        .pw-submit-btn:not(:disabled):hover { transform: translateY(-1px); }
        .pw-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .pw-google-btn {
          width: 100%; height: 44px; border-radius: 9999px;
          border: 1.5px solid rgba(17,24,39,0.14); background: #fff;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          font-size: 14px; font-weight: 500; color: #374151;
          cursor: pointer; transition: border-color 150ms, transform 150ms;
          font-family: 'Inter', sans-serif;
        }
        .pw-google-btn:not(:disabled):hover { border-color: rgba(17,24,39,0.32); transform: translateY(-1px); }
        .pw-google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, marginBottom: 32, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <IconLogo/>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Pathwise</span>
        </Link>
      </div>

      {/* Role toggle */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 400 }}>I am signing up as a…</p>
        <div ref={pillRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(17,24,39,0.10)', borderRadius: 9999, padding: 4, boxShadow: '0 1px 4px rgba(17,24,39,0.06)' }} role="group" aria-label="Select account type">
          <div aria-hidden style={{ position: 'absolute', top: 4, height: 'calc(100% - 8px)', borderRadius: 9999, background: accent.color, left: indicator.left, width: indicator.width, transition: 'left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1), background 300ms ease', zIndex: 0, boxShadow: `0 2px 8px ${accent.color}44` }}/>
          <button ref={seekerRef} onClick={() => setRole('seeker')} aria-pressed={role === 'seeker'} style={{ position: 'relative', zIndex: 1, padding: '8px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 500, color: role === 'seeker' ? '#fff' : '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 200ms ease', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>Job Hunter</button>
          <button ref={recruiterRef} onClick={() => setRole('recruiter')} aria-pressed={role === 'recruiter'} style={{ position: 'relative', zIndex: 1, padding: '8px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 500, color: role === 'recruiter' ? '#fff' : '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 200ms ease', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>HR Teams</button>
        </div>
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: 1, borderRadius: 32, background: role === 'seeker' ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(255,255,255,0.92) 60%, rgba(17,24,39,0.07) 100%)' : 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(255,255,255,0.92) 60%, rgba(17,24,39,0.07) 100%)', transition: 'background 300ms ease' }}>
        <div style={{ borderRadius: 31, background: '#FFFFFF', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)', padding: '36px 36px 32px', overflow: 'hidden', position: 'relative' }}>
          <div aria-hidden style={{ position: 'absolute', top: '-30%', right: '-10%', width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${accent.color}14 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 300ms ease' }}/>

          <div style={{ marginBottom: 24, position: 'relative' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>Create your account</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280', fontWeight: 400, lineHeight: 1.6 }}>{role === 'seeker' ? 'Start optimising your resume and tracking jobs.' : 'Start screening candidates and building your pipeline.'}</p>
          </div>

          <button className="pw-google-btn" onClick={handleGoogleSignUp} disabled={googleLoading}>
            <IconGoogle/>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor="reg-name" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Full name</label>
              <input id="reg-name" type="text" required placeholder="Your full name"
                value={name} onChange={e => setName(e.target.value)}
                className={`pw-input pw-input-${role}`}
                autoComplete="name"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor="reg-email" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Email</label>
              <input id="reg-email" type="email" required placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className={`pw-input pw-input-${role}`}
                autoComplete="email"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor="reg-password" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
              <input id="reg-password" type="password" required minLength={8} placeholder="Min. 8 characters"
                value={password} onChange={e => setPassword(e.target.value)}
                className={`pw-input pw-input-${role}`}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', fontSize: 13, color: '#dc2626', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="pw-submit-btn"
              style={{ background: loading ? `${accent.color}88` : accent.color, boxShadow: `rgba(0,0,0,0.25) 0px 8px 20px -6px, ${accent.color}44 0px 0px 0px 1px` }}
            >
              {loading ? 'Creating account…' : (role === 'seeker' ? 'Start as Job Hunter' : 'Start as HR Teams')}
              {!loading && <IconArrowRight/>}
            </button>
          </form>

          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Already have an account?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,0.08)' }}/>
          </div>
          <Link href="/auth/login" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 9999, border: '1.5px solid rgba(17,24,39,0.14)', color: '#374151', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'border-color 150ms ease, color 150ms ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.32)'; (e.currentTarget as HTMLElement).style.color = '#111827'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,24,39,0.14)'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
          >Sign in instead</Link>
        </div>
      </div>

      <p style={{ position: 'relative', zIndex: 1, marginTop: 24, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
        By signing up you agree to our <Link href="#" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</Link> and <Link href="#" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy Policy</Link>.
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#F7F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#9CA3AF' }}>Loading…</div>}>
      <RegisterForm/>
    </Suspense>
  );
}
