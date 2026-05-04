"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ─ Icons ─────────────────────────────────────────────────────────────────────────
const IconTarget = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6"/>
    <circle cx="12" cy="12" r="4.5" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6"/>
    <circle cx="12" cy="12" r="1.5" fill={active ? "#fff" : "#6B7280"}/>
  </svg>
);

const IconChat = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 4h16v12H7l-4 4V4z" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBriefcase = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="2" y="7" width="20" height="14" rx="3" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconTracker = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 6h16M4 10h10M4 14h12M4 18h8" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconCvBuilder = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="4" y="2" width="16" height="20" rx="2" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6"/>
    <path d="M8 7h8M8 11h8M8 15h5" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconSettings = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="3" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6"/>
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 6h16M4 12h16M4 18h16" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

// ─ Nav items ────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/dashboard",            label: "Job Match",       Icon: IconTarget    },
  { href: "/dashboard/cv-builder", label: "Resume Builder",  Icon: IconCvBuilder },
  { href: "/dashboard/chat",       label: "AI Career Coach", Icon: IconChat      },
  { href: "/dashboard/jobs",       label: "Browse Jobs",     Icon: IconBriefcase },
  { href: "/dashboard/tracker",    label: "Applications",    Icon: IconTracker   },
];

// ─ Sidebar ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 240,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRight: "1px solid rgba(17,24,39,0.07)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 4px 0 24px rgba(17,24,39,0.04)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="lg:translate-x-0"
      >
        {/* Logo row */}
        <div style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid rgba(17,24,39,0.07)",
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <Image src="/logo.png" alt="Krino" width={44} height={44} priority style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Krino</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6 }}
            aria-label="Close menu"
          >
            <IconX />
          </button>
        </div>

        {/* Section label */}
        <div style={{ padding: "20px 20px 8px" }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9CA3AF",
          }}>
            Job Seeker
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 9999,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  letterSpacing: "0.35px",
                  color: active ? "#FFFFFF" : "#6B7280",
                  background: active ? "#111827" : "transparent",
                  boxShadow: active
                    ? "rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px"
                    : "none",
                  transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(17,24,39,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#111827";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#6B7280";
                  }
                }}
              >
                <Icon active={active} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: settings */}
        <div style={{ padding: "12px 12px 20px", borderTop: "1px solid rgba(17,24,39,0.07)" }}>
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 9999,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: "0.35px",
              color: "#6B7280",
              transition: "background 150ms ease, color 150ms ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(17,24,39,0.05)";
              (e.currentTarget as HTMLElement).style.color = "#111827";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#6B7280";
            }}
          >
            <IconSettings active={false} />
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
}

// ─ Topbar ───────────────────────────────────────────────────────────────────────────
function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { email } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.getElementById("dashboard-scroll-area");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const pageTitle = NAV_ITEMS.find(
    n => n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href))
  )?.label ?? "Dashboard";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: scrolled ? "rgba(247,243,239,0.90)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(17,24,39,0.07)" : "1px solid transparent",
        transition: "background 300ms ease, border-color 300ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onMenuClick}
          className="lg:hidden"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>
          {pageTitle}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ThemeToggle variant="icon" />
        <LanguageSwitcher />
        {email && (
          <span
            style={{ fontSize: 13, fontWeight: 400, color: "#9CA3AF", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            className="hidden sm:inline-block"
          >
            {email}
          </span>
        )}
        <ProfileDropdown />
      </div>
    </header>
  );
}

// ─ Root layout ─────────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#F7F3EF",
        fontFamily: "'Inter', sans-serif",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Warm radial glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)",
        }}
      />

      {/* Fine grid overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: [
            "linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "48px 48px",
        }}
      />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        id="dashboard-scroll-area"
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          marginLeft: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
        className="lg:ml-[240px]"
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ flex: 1, padding: "24px 24px 48px" }}>{children}</main>
      </div>
    </div>
  );
}
