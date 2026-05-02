'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/client';
import { supabase } from '@/lib/supabase';
import {
  User, Bell, Shield, Palette, Globe, LogOut,
  ChevronRight, Check, Loader2,
} from 'lucide-react';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  text:    '#111827',
  muted:   '#6B7280',
  subtle:  '#9CA3AF',
  border:  'rgba(17,24,39,0.09)',
  primary: '#111827',
  danger:  '#DC2626',
  success: '#16A34A',
  accent:  '#FFEDD5',
  pill:    9999,
  ctrl:    10,
  shadow:  {
    pill: 'rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset',
  },
};

// ─── Primitives ───────────────────────────────────────────────────────────────
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.subtle }}>
        {label}
      </span>
    </div>
  );
}

function Row({
  label, description, control, last = false,
}: { label: string; description?: string; control: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, padding: '15px 0',
      borderBottom: last ? 'none' : `1px solid ${T.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: '32px 0 28px' }} />;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch" aria-checked={on}
      style={{
        width: 44, height: 24, borderRadius: T.pill, border: 'none', cursor: 'pointer',
        background: on ? T.primary : 'rgba(17,24,39,0.14)',
        position: 'relative', transition: 'background 200ms ease', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
      }} />
    </button>
  );
}

function PrimaryBtn({
  onClick, loading: busy, children, danger,
}: { onClick: () => void; loading?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 20px', borderRadius: T.pill, border: 'none',
      background: danger ? T.danger : T.primary, color: '#fff',
      fontSize: 13, fontWeight: 500, letterSpacing: '0.35px',
      fontFamily: 'inherit', cursor: busy ? 'wait' : 'pointer',
      opacity: busy ? 0.6 : 1, boxShadow: T.shadow.pill,
      transition: 'opacity 150ms ease',
    }}>
      {busy && <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

function FieldInput({ value, onChange, placeholder, width = 220 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: number;
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width, border: `1px solid ${T.border}`, borderRadius: T.ctrl,
        background: 'rgba(17,24,39,0.03)', padding: '8px 12px',
        fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { email } = useAuth();
  const [name,          setName]          = useState('');
  const [bio,           setBio]           = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);

  const [notifJobMatch, setNotifJobMatch] = useState(true);
  const [notifAnalysis, setNotifAnalysis] = useState(false);
  const [notifDigest,   setNotifDigest]   = useState(true);

  const [theme,    setTheme]    = useState<'system' | 'light' | 'dark'>('system');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name, bio').eq('id', user.id).single();
      if (data) { setName(data.full_name ?? ''); setBio(data.bio ?? ''); }
    })();
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').upsert({ id: user.id, full_name: name, bio, updated_at: new Date().toISOString() });
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  return (
    <div style={{ maxWidth: 680, fontFamily: 'Inter, sans-serif', color: T.text }}>

      {/* Page title */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: T.text }}>Settings</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: T.muted }}>Manage your account, preferences and notifications.</p>
      </div>

      {/* ── Account ── */}
      <SectionTitle icon={<User style={{ width: 13, height: 13, color: T.subtle }} />} label="Account" />
      <Row
        label="Full name"
        description="Shown in your profile and reports."
        control={<FieldInput value={name} onChange={setName} placeholder="Your name" />}
      />
      <Row
        label="Email address"
        description="Your sign-in email — contact support to change."
        control={<span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>{email ?? '—'}</span>}
      />
      <Row
        label="Bio"
        description="A short note about yourself, visible in shared reports."
        control={
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
            placeholder="e.g. Data analyst open to remote roles"
            style={{
              width: 260, border: `1px solid ${T.border}`, borderRadius: T.ctrl,
              background: 'rgba(17,24,39,0.03)', padding: '8px 12px',
              fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none', resize: 'vertical',
            }}
          />
        }
        last
      />
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <PrimaryBtn onClick={saveProfile} loading={savingProfile}>
          {profileSaved ? <><Check style={{ width: 13, height: 13 }} /> Saved</> : 'Save Changes'}
        </PrimaryBtn>
        {profileSaved && <span style={{ fontSize: 12, color: T.success, fontWeight: 500 }}>Profile updated ✓</span>}
      </div>

      <Divider />

      {/* ── Notifications ── */}
      <SectionTitle icon={<Bell style={{ width: 13, height: 13, color: T.subtle }} />} label="Notifications" />
      <Row
        label="Job match alerts"
        description="Get notified when new jobs match your CV profile."
        control={<Toggle on={notifJobMatch} onChange={setNotifJobMatch} />}
      />
      <Row
        label="Analysis complete"
        description="Notify when a CV analysis or score report is ready."
        control={<Toggle on={notifAnalysis} onChange={setNotifAnalysis} />}
      />
      <Row
        label="Weekly digest"
        description="A weekly summary of your applications and activity."
        control={<Toggle on={notifDigest} onChange={setNotifDigest} />}
        last
      />

      <Divider />

      {/* ── Appearance ── */}
      <SectionTitle icon={<Palette style={{ width: 13, height: 13, color: T.subtle }} />} label="Appearance" />
      <Row
        label="Theme"
        description="Choose your interface color scheme."
        control={
          <div style={{ display: 'flex', gap: 6 }}>
            {(['system', 'light', 'dark'] as const).map(opt => (
              <button key={opt} onClick={() => setTheme(opt)} style={{
                padding: '6px 14px', borderRadius: T.pill, border: 'none', cursor: 'pointer',
                background: theme === opt ? T.primary : 'rgba(17,24,39,0.06)',
                color: theme === opt ? '#fff' : T.muted,
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                boxShadow: theme === opt ? T.shadow.pill : 'none',
                transition: 'all 150ms ease',
              }}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        }
        last
      />

      <Divider />

      {/* ── Language ── */}
      <SectionTitle icon={<Globe style={{ width: 13, height: 13, color: T.subtle }} />} label="Language & Region" />
      <Row
        label="Language"
        description="Interface language for Pathwise."
        control={
          <select value={language} onChange={e => setLanguage(e.target.value)} style={{
            border: `1px solid ${T.border}`, borderRadius: T.ctrl,
            background: 'rgba(17,24,39,0.03)', padding: '8px 12px',
            fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none',
          }}>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
            <option value="es">Español</option>
          </select>
        }
        last
      />

      <Divider />

      {/* ── Security ── */}
      <SectionTitle icon={<Shield style={{ width: 13, height: 13, color: T.subtle }} />} label="Security" />
      <Row
        label="Password"
        description="Change your account password."
        control={
          <a href="/reset-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: T.primary, textDecoration: 'none' }}>
            Change password <ChevronRight style={{ width: 14, height: 14 }} />
          </a>
        }
      />
      <Row
        label="Active sessions"
        description="You are currently signed in on this device."
        control={
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: T.pill, background: 'rgba(22,163,74,0.1)', color: T.success, fontWeight: 600 }}>
            1 active
          </span>
        }
        last
      />

      <Divider />

      {/* ── Sign out ── */}
      <SectionTitle icon={<LogOut style={{ width: 13, height: 13, color: T.subtle }} />} label="Session" />
      <Row
        label="Sign out of Pathwise"
        description="You will be redirected to the home page."
        control={<PrimaryBtn onClick={signOut} danger>Sign Out</PrimaryBtn>}
        last
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
