'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/client';
import { supabase } from '@/lib/supabase';
import {
  User, Bell, Shield, Palette, Globe, LogOut,
  ChevronRight, Check, Loader2,
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       '#F3F4F6',
  surface:  '#FFFFFF',
  primary:  '#111827',
  accent:   '#FFEDD5',
  text:     '#111827',
  muted:    '#6B7280',
  subtle:   '#9CA3AF',
  border:   'rgba(17,24,39,0.08)',
  danger:   '#DC2626',
  success:  '#16A34A',
  radius:   { page: 28, section: 20, control: 10, pill: 9999 },
  shadow: {
    card: 'rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 1px 1px -0.5px, rgba(0,0,0,0.06) 0px 3px 3px -1.5px, rgba(0,0,0,0.06) 0px 6px 6px -3px, rgba(0,0,0,0.06) 0px 12px 12px -6px, rgba(0,0,0,0.06) 0px 24px 24px -12px',
    pill: 'rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset',
  },
};

// ─── Shared ───────────────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(17,24,39,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{label}</span>
    </div>
  );
}

function SettingRow({
  label, description, control, last = false,
}: { label: string; description?: string; control: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '16px 24px',
      borderBottom: last ? 'none' : `1px solid ${T.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: T.radius.pill, border: 'none', cursor: 'pointer',
        background: on ? T.primary : 'rgba(17,24,39,0.15)',
        position: 'relative', transition: 'background 200ms ease', flexShrink: 0,
      }}
      aria-checked={on} role='switch'
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function PrimaryBtn({ onClick, loading: isLoading, children, danger }: { onClick: () => void; loading?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={isLoading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '9px 20px', borderRadius: T.radius.pill,
        border: 'none', cursor: isLoading ? 'wait' : 'pointer',
        background: danger ? T.danger : T.primary,
        color: '#fff', fontSize: 13, fontWeight: 500, letterSpacing: '0.35px',
        fontFamily: 'inherit', boxShadow: T.shadow.pill,
        transition: 'opacity 150ms ease', opacity: isLoading ? 0.6 : 1,
      }}
    >{isLoading ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : null}{children}</button>
  );
}

// ─── Section panels ───────────────────────────────────────────────────────────
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: T.surface, borderRadius: T.radius.page, boxShadow: T.shadow.card, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { email } = useAuth();
  const [name,          setName]          = useState('');
  const [bio,           setBio]           = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);

  // Notification toggles
  const [notifJobMatch, setNotifJobMatch] = useState(true);
  const [notifAnalysis, setNotifAnalysis] = useState(false);
  const [notifDigest,   setNotifDigest]   = useState(true);

  // Appearance
  const [theme,    setTheme]    = useState<'system' | 'light' | 'dark'>('system');
  const [language, setLanguage] = useState('en');

  // Load profile from Supabase on mount
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

  // ─── Page header ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif' }}>

      {/* Page title area */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: T.text, letterSpacing: '-0.025em' }}>Settings</div>
        <div style={{ fontSize: 14, color: T.muted, marginTop: 4 }}>Manage your account, preferences and notifications.</div>
      </div>

      {/* ── Account ── */}
      <Panel>
        <SectionHeader icon={<User style={{ width: 16, height: 16, color: T.muted }} />} label='Account' />
        <SettingRow
          label='Full name'
          description='Shown in your profile and reports.'
          control={
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder='Your name'
              style={{ width: 200, border: `1px solid ${T.border}`, borderRadius: T.radius.control, background: 'rgba(17,24,39,0.03)', padding: '8px 12px', fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none' }}
            />
          }
        />
        <SettingRow
          label='Email address'
          description='Your sign-in email — contact support to change.'
          control={<span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>{email ?? '—'}</span>}
        />
        <SettingRow
          label='Bio'
          description='A short note about yourself, visible in shared reports.'
          control={
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder='e.g. Data analyst open to remote roles'
              style={{ width: 240, border: `1px solid ${T.border}`, borderRadius: T.radius.control, background: 'rgba(17,24,39,0.03)', padding: '8px 12px', fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
            />
          }
          last
        />
        <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${T.border}` }}>
          <PrimaryBtn onClick={saveProfile} loading={savingProfile}>{profileSaved ? <><Check style={{ width: 13, height: 13 }} /> Saved</> : 'Save Changes'}</PrimaryBtn>
          {profileSaved && <span style={{ fontSize: 12, color: T.success, fontWeight: 500 }}>Profile updated ✓</span>}
        </div>
      </Panel>

      {/* ── Notifications ── */}
      <Panel>
        <SectionHeader icon={<Bell style={{ width: 16, height: 16, color: T.muted }} />} label='Notifications' />
        <SettingRow
          label='Job match alerts'
          description='Get notified when new jobs match your CV profile.'
          control={<Toggle on={notifJobMatch} onChange={setNotifJobMatch} />}
        />
        <SettingRow
          label='Analysis complete'
          description='Notify when a CV analysis or score report is ready.'
          control={<Toggle on={notifAnalysis} onChange={setNotifAnalysis} />}
        />
        <SettingRow
          label='Weekly digest'
          description='A weekly summary of your applications and activity.'
          control={<Toggle on={notifDigest} onChange={setNotifDigest} />}
          last
        />
      </Panel>

      {/* ── Appearance ── */}
      <Panel>
        <SectionHeader icon={<Palette style={{ width: 16, height: 16, color: T.muted }} />} label='Appearance' />
        <SettingRow
          label='Theme'
          description='Choose your interface color scheme.'
          control={
            <div style={{ display: 'flex', gap: 6 }}>
              {(['system', 'light', 'dark'] as const).map(opt => (
                <button key={opt} onClick={() => setTheme(opt)}
                  style={{
                    padding: '6px 14px', borderRadius: T.radius.pill, border: 'none', cursor: 'pointer',
                    background: theme === opt ? T.primary : 'rgba(17,24,39,0.06)',
                    color: theme === opt ? '#fff' : T.muted,
                    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                    boxShadow: theme === opt ? T.shadow.pill : 'none',
                    transition: 'all 150ms ease',
                  }}
                >{opt.charAt(0).toUpperCase() + opt.slice(1)}</button>
              ))}
            </div>
          }
          last
        />
      </Panel>

      {/* ── Language & Region ── */}
      <Panel>
        <SectionHeader icon={<Globe style={{ width: 16, height: 16, color: T.muted }} />} label='Language & Region' />
        <SettingRow
          label='Language'
          description='Interface language for Pathwise.'
          control={
            <select value={language} onChange={e => setLanguage(e.target.value)}
              style={{ border: `1px solid ${T.border}`, borderRadius: T.radius.control, background: 'rgba(17,24,39,0.03)', padding: '8px 12px', fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none' }}
            >
              <option value='en'>English</option>
              <option value='fr'>Français</option>
              <option value='ar'>العربية</option>
              <option value='es'>Español</option>
            </select>
          }
          last
        />
      </Panel>

      {/* ── Security ── */}
      <Panel>
        <SectionHeader icon={<Shield style={{ width: 16, height: 16, color: T.muted }} />} label='Security' />
        <SettingRow
          label='Password'
          description='Change your account password.'
          control={
            <a href='/reset-password'
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: T.primary, textDecoration: 'none' }}
            >Change password <ChevronRight style={{ width: 14, height: 14 }} /></a>
          }
        />
        <SettingRow
          label='Active sessions'
          description='You are currently signed in on this device.'
          control={<span style={{ fontSize: 12, padding: '3px 10px', borderRadius: T.radius.pill, background: 'rgba(22,163,74,0.1)', color: T.success, fontWeight: 600 }}>1 active</span>}
          last
        />
      </Panel>

      {/* ── Danger zone ── */}
      <Panel>
        <SectionHeader icon={<LogOut style={{ width: 16, height: 16, color: T.danger }} />} label='Sign out' />
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>Sign out of Pathwise</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>You will be redirected to the home page.</div>
          </div>
          <PrimaryBtn onClick={signOut} danger>Sign Out</PrimaryBtn>
        </div>
      </Panel>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
