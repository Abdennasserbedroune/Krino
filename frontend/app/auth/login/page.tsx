'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconSeeker = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const IconRecruiter = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);
const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password'))
    return 'Wrong email or password.';
  if (m.includes('email not confirmed'))
    return 'Please verify your email first. Check your inbox.';
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Too many attempts. Wait a few minutes and try again.';
  if (m.includes('user not found') || m.includes('no user'))
    return 'No account found with this email.';
  return `Sign-in failed: ${msg}`;
}

// Correct dashboard routes
function getDashboardRoute(role: string | null | undefined): string {
  if (role === 'recruiter') return '/dashboard/recruiter';
  return '/dashboard'; // seeker + fallback
}

type Role = 'seeker' | 'recruiter';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: 1, borderRadius: 32, background: 'linear-gradient(135deg,rgba(255,255,255,0.92) 0%,rgba(17,24,39,0.07) 100%)' }}>
      <div style={{ borderRadius: 31, background: '#fff', padding: '40px 36px 36px', boxShadow: '0 0 0 1px rgba(0,0,0,0.06),0 6px 6px -3px rgba(0,0,0,0.06),0 24px 24px -12px rgba(0,0,0,0.06)' }}>
        {children}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(getDashboardRoute(data.session.user?.user_metadata?.role));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickRole = (r: Role) => { setRole(r); setStep('form'); setError(null); };

  const googleSignIn = useCallback(async (r: Role) => {
    setGLoading(true); setError(null);
    const sb = createClient();
    await fetch('/api/auth/set-pending-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: r }) });
    const { error: e } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } },
    });
    if (e) { setError('Google sign-in failed.'); setGLoading(false); }
  }, []);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    const sb = createClient();
    const { data, error: authErr } = await sb.auth.signInWithPassword({ email, password });
    if (authErr) {
      setError(mapAuthError(authErr.message)); setLoading(false); return;
    }
    // Check stored role vs selected role
    const { data: profile } = await sb.from('users').select('role').eq('id', data.user.id).maybeSingle();
    if (profile && role && profile.role !== role) {
      await sb.auth.signOut();
      setError(`This account is registered as a ${profile.role === 'recruiter' ? 'Recruiter' : 'Job Seeker'}. Go back and pick the correct role.`);
      setLoading(false); return;
    }
    router.push(getDashboardRoute(profile?.role ?? role));
  }, [email, password, role, router]);

  const inputCss: React.CSSProperties = { height: 44, width: '100%', padding: '0 14px', borderRadius: 12, border: '1.5px solid rgba(17,24,39,.14)', background: 'rgba(17,24,39,.02)', fontSize: 14, fontFamily: 'inherit', color: '#111827', outline: 'none', boxSizing: 'border-box' };
  const accent = role === 'recruiter' ? '#f97316' : '#3b82f6';

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F3EF', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflowX: 'hidden' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,237,213,.55) 0%,transparent 70%)' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(to right,rgba(17,24,39,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(17,24,39,.04) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Krino" width={120} height={40} priority />
        </Link>
      </div>

      {step === 'role' && (
        <Card>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 600, color: '#111827', letterSpacing: '-.02em' }}>Welcome back</h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B7280' }}>How are you using Krino?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(['seeker', 'recruiter'] as Role[]).map(r => (
              <button key={r} onClick={() => pickRole(r)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 16, border: `1.5px solid ${r === 'seeker' ? 'rgba(59,130,246,.25)' : 'rgba(249,115,22,.25)'}`, background: r === 'seeker' ? 'rgba(59,130,246,.04)' : 'rgba(249,115,22,.04)', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: r === 'seeker' ? 'rgba(59,130,246,.10)' : 'rgba(249,115,22,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r === 'seeker' ? <IconSeeker /> : <IconRecruiter />}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{r === 'seeker' ? 'Job Seeker' : 'Recruiter / HR Team'}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{r === 'seeker' ? 'Analyse & optimise your resume' : 'Screen and rank candidates'}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke={r === 'seeker' ? '#3b82f6' : '#f97316'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
          <div style={{ margin: '24px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,.08)' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>New to Krino?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,.08)' }} />
          </div>
          <Link href="/auth/register" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 9999, border: '1.5px solid rgba(17,24,39,.14)', color: '#374151', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Create an account</Link>
        </Card>
      )}

      {step === 'form' && role && (
        <Card>
          <button onClick={() => { setStep('role'); setError(null); }} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6B7280', padding: 0, fontFamily: 'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: role === 'seeker' ? 'rgba(59,130,246,.06)' : 'rgba(249,115,22,.06)', border: `1px solid ${role === 'seeker' ? 'rgba(59,130,246,.20)' : 'rgba(249,115,22,.20)'}`, marginBottom: 28 }}>
            {role === 'seeker' ? <IconSeeker /> : <IconRecruiter />}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{role === 'seeker' ? 'Job Seeker' : 'Recruiter / HR Team'}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Signing in as {role}</div>
            </div>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-.02em' }}>Welcome back</h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280' }}>Sign in to your Krino account</p>

          <button onClick={() => googleSignIn(role)} disabled={gLoading} style={{ width: '100%', height: 44, borderRadius: 9999, border: '1.5px solid rgba(17,24,39,.14)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14, fontWeight: 500, color: '#374151', cursor: gLoading ? 'not-allowed' : 'pointer', opacity: gLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
            <IconGoogle />{gLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,.08)' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(17,24,39,.08)' }} />
          </div>

          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="l-email" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Email</label>
              <input id="l-email" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={inputCss}
                onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(17,24,39,.14)'; }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="l-pass" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <input id="l-pass" type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={inputCss}
                onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(17,24,39,.14)'; }} />
            </div>
            {error && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.20)', fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ marginTop: 4, height: 48, width: '100%', borderRadius: 9999, background: loading ? 'rgba(17,24,39,.45)' : (role === 'recruiter' ? '#f97316' : '#111827'), color: '#fff', fontSize: 15, fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in…' : <><span>Sign in</span><IconArrowRight /></>}
            </button>
          </form>
        </Card>
      )}

      <p style={{ position: 'relative', zIndex: 1, marginTop: 28, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
        Protected by Supabase Auth &amp; PKCE.
      </p>
    </div>
  );
}
