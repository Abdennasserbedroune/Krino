"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sticky banner shown to logged-in users whose email is not yet confirmed.
 * - Appears on every page until email_confirmed_at is set
 * - Clicking the CTA sends a confirmation email (resend) via Supabase
 * - 60s cooldown after sending to prevent spam
 * - Dismissible per session (comes back on next visit)
 * - Auto-hides as soon as Supabase fires the EMAIL_CONFIRMED auth event
 */
export function EmailConfirmBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSb = () => {
    if (!sbRef.current) sbRef.current = createClient();
    return sbRef.current;
  };

  useEffect(() => {
    const sb = getSb();
    // Check current session
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u && !u.email_confirmed_at) {
        setEmail(u.email ?? null);
        setShow(true);
      }
    });
    // Listen for confirmation — hide immediately when confirmed
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        setShow(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    await getSb().auth.resend({ type: "signup", email });
    setSent(true);
    setCooldown(60);
  }, [email, cooldown]);

  if (!show || dismissed) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "calc(100% - 32px)",
        maxWidth: 560,
        background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.07)",
        padding: "14px 16px 14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#f5f5f4" }}>
          Confirm your email address
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#a8a29e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sent
            ? `Confirmation link sent to ${email} — check your inbox`
            : `We sent a link to ${email ?? "your email"}. Click it to verify your account.`}
        </p>
      </div>

      {/* CTA */}
      {!sent ? (
        <button
          onClick={handleSend}
          disabled={cooldown > 0}
          style={{
            flexShrink: 0,
            height: 34,
            padding: "0 14px",
            borderRadius: 8,
            border: "1px solid rgba(245,158,11,0.4)",
            background: "rgba(245,158,11,0.12)",
            color: "#fbbf24",
            fontSize: 12,
            fontWeight: 600,
            cursor: cooldown > 0 ? "not-allowed" : "pointer",
            opacity: cooldown > 0 ? 0.5 : 1,
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send confirmation"}
        </button>
      ) : (
        <span style={{ flexShrink: 0, fontSize: 12, color: "#4ade80", fontWeight: 600 }}>Sent ✓</span>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 4, color: "#78716c", lineHeight: 1 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
