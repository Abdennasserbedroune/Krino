'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/client';
import { supabase } from '@/lib/supabase';
import {
  User, Bell, Shield, Palette, Globe, LogOut, ChevronRight, Check, Loader2,
} from 'lucide-react';

// ── Warm palette — mirrors the dashboard layout (#F7F3EF bg, #FFEDD5 accent) ──
const T = {
  text:    '#1C1917',          // warm near-black (not cold #111827)
  muted:   '#78716C',          // warm stone-500
  subtle:  '#A8A29E',          // warm stone-400
  border:  'rgba(120,113,108,0.18)', // warm stone border
  primary: '#C2410C',          // terracotta — matches the warm accent family
  danger:  '#DC2626',
  success: '#16A34A',
  inputBg: 'rgba(255,255,255,0.6)',  // soft white on the warm cream bg
  pill:    9999 as number,
  ctrl:    10   as number,
};

// ── Primitives ─────────────────────────────────────────────────────
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
      {icon}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: T.subtle,
      }}>{label}</span>
    </div>
  );
}

function Row({
  label, description, control, last = false,
}: { label: string; description?: string; control: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 32, padding: '14px 0',
      borderBottom: last ? 'none' : `1px solid ${T.border}`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text, lineHeight: 1.4 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: '36px 0 30px' }} />;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{
        width: 44, height: 24, borderRadius: T.pill, border: 'none', cursor: 'pointer',
        background: on ? T.primary : 'rgba(120,113,108,0.25)',
        position: 'relative', transition: 'background 200ms ease', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(28,25,23,0.25)',
      }} />
    </button>
  );
}

function Btn({
  onClick, loading: busy, children, danger, ghost,
}: { onClick: () => void; loading?: boolean; children: React.ReactNode; danger?: boolean; ghost?: boolean }) {
  const bg    = danger ? T.danger : ghost ? 'transparent' : T.primary;
  const color = ghost ? T.muted : '#fff';
  const bdr   = ghost ? `1px solid ${T.border}` : 'none';
  return (
    <button onClick={onClick} disabled={busy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: ghost ? '7px 18px' : '8px 22px',
      borderRadius: T.pill, border: bdr,
      background: bg, color,
      fontSize: 13, fontWeight: 500, letterSpacing: '0.01em',
      fontFamily: 'inherit', cursor: busy ? 'wait' : 'pointer',
      opacity: busy ? 0.6 : 1,
      transition: 'opacity 150ms ease, transform 150ms ease',
    }}
      onMouseEnter={e => !busy && ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
      onMouseLeave={e => !busy && ((e.currentTarget as HTMLElement).style.opacity = '1')}
    >
      {busy && <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, width = 220 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: number;
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width, boxSizing: 'border-box',
        border: `1px solid ${T.border}`, borderRadius: T.ctrl,
        background: T.inputBg, padding: '8px 12px',
        fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none',
      }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
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
    setSavingProfile(false); setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  const iconProps = { width: 13, height: 13, color: T.subtle } as const;

  return (
    <div style={{ maxWidth: 640, fontFamily: 'Inter, sans-serif', color: T.text }}>

      {/* Page title */}
      <div style={{ marginBottom: 44 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: T.text }}>Settings</h1>
        <p style={{ margin: '5px 0 0', fontSize: 14, color: T.muted, lineHeight: 1.5 }}>Manage your account, preferences and notifications.</p>
      </div>

      {/* ACCOUNT */}
      <SectionTitle icon={<User style={iconProps} />} label="Account" />
      <Row label="Full name" description="Shown in your profile and reports."
        control={<TextInput value={name} onChange={setName} placeholder="Your name" />} />
      <Row label="Email address" description="Your sign-in email — contact support to change."
        control={<span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>{email ?? '—'}</span>} />
      <Row label="Bio" description="A short note about yourself, visible in shared reports."
        last
        control={
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
            placeholder="e.g. Data analyst open to remote roles"
            style={{
              width: 260, boxSizing: 'border-box',
              border: `1px solid ${T.border}`, borderRadius: T.ctrl,
              background: T.inputBg, padding: '8px 12px',
              fontSize: 13, color: T.text, fontFamily: 'inherit',
              outline: 'none', resize: 'vertical', lineHeight: 1.5,
            }}
          />
        }
      />
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn onClick={saveProfile} loading={savingProfile}>
          {profileSaved ? <><Check style={{ width: 13, height: 13 }} /> Saved</> : 'Save Changes'}
        </Btn>
        {profileSaved && <span style={{ fontSize: 12, color: T.success, fontWeight: 500 }}>Profile updated ✓</span>}
      </div>

      <Divider />

      {/* NOTIFICATIONS */}
      <SectionTitle icon={<Bell style={iconProps} />} label="Notifications" />
      <Row label="Job match alerts" description="Get notified when new jobs match your CV profile."
        control={<Toggle on={notifJobMatch} onChange={setNotifJobMatch} />} />
      <Row label="Analysis complete" description="Notify when a CV analysis or score report is ready."
        control={<Toggle on={notifAnalysis} onChange={setNotifAnalysis} />} />
      <Row label="Weekly digest" description="A weekly summary of your applications and activity."
        control={<Toggle on={notifDigest} onChange={setNotifDigest} />} last />

      <Divider />

      {/* APPEARANCE */}
      <SectionTitle icon={<Palette style={iconProps} />} label="Appearance" />
      <Row label="Theme" description="Choose your interface color scheme." last
        control={
          <div style={{ display: 'flex', gap: 6 }}>
            {(['system', 'light', 'dark'] as const).map(opt => (
              <button key={opt} onClick={() => setTheme(opt)} style={{
                padding: '6px 14px', borderRadius: T.pill, border: `1px solid ${theme === opt ? T.primary : T.border}`,
                background: theme === opt ? 'rgba(194,65,12,0.08)' : 'transparent',
                color: theme === opt ? T.primary : T.muted,
                fontSize: 12, fontWeight: theme === opt ? 600 : 400,
                fontFamily: 'inherit', cursor: 'pointer',
                transition: 'all 150ms ease',
              }}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      <Divider />

      {/* LANGUAGE */}
      <SectionTitle icon={<Globe style={iconProps} />} label="Language & Region" />
      <Row label="Language" description="Interface language for Pathwise." last
        control={
          <select value={language} onChange={e => setLanguage(e.target.value)} style={{
            border: `1px solid ${T.border}`, borderRadius: T.ctrl,
            background: T.inputBg, padding: '8px 12px',
            fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none',
          }}>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
            <option value="es">Español</option>
          </select>
        }
      />

      <Divider />

      {/* SECURITY */}
      <SectionTitle icon={<Shield style={iconProps} />} label="Security" />
      <Row label="Password" description="Change your account password."
        control={
          <a href="/reset-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: T.primary, textDecoration: 'none' }}>
            Change password <ChevronRight style={{ width: 14, height: 14 }} />
          </a>
        }
      />
      <Row label="Active sessions" description="You are currently signed in on this device." last
        control={
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: T.pill, background: 'rgba(22,163,74,0.1)', color: T.success, fontWeight: 600, border: '1px solid rgba(22,163,74,0.2)' }}>
            1 active
          </span>
        }
      />

      <Divider />

      {/* SESSION */}
      <SectionTitle icon={<LogOut style={iconProps} />} label="Session" />
      <Row label="Sign out of Pathwise" description="You will be redirected to the home page." last
        control={<Btn onClick={signOut} danger>Sign Out</Btn>}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
