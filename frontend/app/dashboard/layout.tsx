"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ─ Icons ──────────────────────────────────────────────────────────────────────
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
const IconInterview = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6"/>
    <path d="M2 20c0-4 4-7 10-7s10 3 10 7" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M17 13l2 2 4-4" stroke={active ? "#fff" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
// Collapse arrow icon — points left when expanded, right when collapsed
const IconChevron = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden
    style={{ transition: "transform 300ms ease", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
  >
    <path d="M15 18l-6-6 6-6" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─ Nav items ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/dashboard",                label: "Job Match",       Icon: IconTarget    },
  { href: "/dashboard/cv-builder",     label: "Resume Builder",  Icon: IconCvBuilder },
  { href: "/dashboard/chat",           label: "AI Career Coach", Icon: IconChat      },
  { href: "/dashboard/interview-prep", label: "Interview Prep",  Icon: IconInterview },
  { href: "/dashboard/jobs",           label: "Browse Jobs",     Icon: IconBriefcase },
  { href: "/dashboard/tracker",        label: "Applications",    Icon: IconTracker   },
];

const SIDEBAR_W_EXPANDED  = 240;
const SIDEBAR_W_COLLAPSED = 64;

// ─ Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({
  open, onClose, collapsed, onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const w = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden"
          style={{ zIndex: 40 }}
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
          width: w,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRight: "1px solid rgba(17,24,39,0.07)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 4px 0 24px rgba(17,24,39,0.04)",
          // mobile: slide in/out. desktop: always visible, just width changes
          transition: "width 280ms cubic-bezier(0.4,0,0.2,1), transform 300ms cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
        // on mobile: translate based on open. on desktop: always translateX(0)
        className={open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      >
        {/* Logo row */}
        <div style={{
          height: 60,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 16px 0 20px",
          borderBottom: "1px solid rgba(17,24,39,0.07)",
          overflow: "hidden",
          transition: "padding 280ms ease, justify-content 280ms ease",
        }}>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 10, textDecoration: "none", flexShrink: 0 }}
            title="Krino"
          >
            <Image src="/logo.png" alt="Krino" width={36} height={36} priority style={{ objectFit: "contain", flexShrink: 0 }}/>
            <span
              style={{
                fontSize: 18, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em",
                overflow: "hidden",
                whiteSpace: "nowrap",
                maxWidth: collapsed ? 0 : 120,
                opacity: collapsed ? 0 : 1,
                transition: "max-width 280ms ease, opacity 200ms ease",
              }}
            >Krino</span>
          </Link>

          {/* Mobile close button — only when sidebar drawer is open */}
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, flexShrink: 0 }}
              aria-label="Close menu"
            >
              <IconClose />
            </button>
          )}
        </div>

        {/* Section label */}
        <div
          style={{
            padding: collapsed ? "16px 0 6px" : "20px 20px 8px",
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-start",
            overflow: "hidden",
            transition: "padding 280ms ease",
          }}
        >
          {collapsed ? (
            // thin divider line instead of label when collapsed
            <div style={{ width: 28, height: 1, background: "rgba(17,24,39,0.10)", borderRadius: 1 }}/>
          ) : (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#9CA3AF",
              whiteSpace: "nowrap",
            }}>Job Seeker</span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: collapsed ? "0 8px" : "0 10px", display: "flex", flexDirection: "column", gap: 2, overflow: "hidden", transition: "padding 280ms ease" }}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                title={collapsed ? label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 10,
                  padding: collapsed ? "10px 0" : "9px 12px",
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
                  transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease, padding 280ms ease, justify-content 280ms ease",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
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
                <span style={{ flexShrink: 0, display: "flex" }}><Icon active={active} /></span>
                <span
                  style={{
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    maxWidth: collapsed ? 0 : 160,
                    opacity: collapsed ? 0 : 1,
                    transition: "max-width 280ms ease, opacity 180ms ease",
                  }}
                >{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: settings + collapse toggle */}
        <div style={{ padding: collapsed ? "12px 8px 16px" : "12px 10px 16px", borderTop: "1px solid rgba(17,24,39,0.07)", display: "flex", flexDirection: "column", gap: 2, transition: "padding 280ms ease" }}>
          {/* Settings */}
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            title={collapsed ? "Settings" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              padding: collapsed ? "10px 0" : "9px 12px",
              borderRadius: 9999,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: "0.35px",
              color: "#6B7280",
              transition: "background 150ms ease, color 150ms ease, padding 280ms ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
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
            <span style={{ flexShrink: 0, display: "flex" }}><IconSettings active={false} /></span>
            <span style={{
              overflow: "hidden", whiteSpace: "nowrap",
              maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1,
              transition: "max-width 280ms ease, opacity 180ms ease",
            }}>Settings</span>
          </Link>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              padding: collapsed ? "10px 0" : "9px 12px",
              borderRadius: 9999,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 400,
              color: "#9CA3AF",
              width: "100%",
              transition: "background 150ms ease, color 150ms ease, padding 280ms ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(17,24,39,0.04)";
              (e.currentTarget as HTMLElement).style.color = "#6B7280";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
            }}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>
              <IconChevron collapsed={collapsed} />
            </span>
            <span style={{
              overflow: "hidden", whiteSpace: "nowrap",
              maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1,
              transition: "max-width 280ms ease, opacity 180ms ease",
            }}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─ Topbar ─────────────────────────────────────────────────────────────────────
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

  const pageTitle =
    NAV_ITEMS.find(n => n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label ??
    "Dashboard";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        height: 60,
        flexShrink: 0,
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
        {/* Mobile hamburger only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
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
            style={{ fontSize: 13, color: "#9CA3AF", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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

// ─ Root layout ────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [collapsed,   setCollapsed]           = useState(false);
  const [hydrated,    setHydrated]            = useState(false);

  // Persist collapse state across refreshes
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
    setHydrated(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  const marginLeft = hydrated
    ? (collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED)
    : SIDEBAR_W_EXPANDED;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#F7F3EF",
      fontFamily: "'Inter', sans-serif",
      overflowX: "hidden",
      position: "relative",
    }}>
      {/* Warm radial glow */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,237,213,0.55) 0%, transparent 70%)",
      }}/>

      {/* Fine grid overlay */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: [
          "linear-gradient(to right, rgba(17,24,39,0.04) 1px, transparent 1px)",
          "linear-gradient(to bottom, rgba(17,24,39,0.04) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "48px 48px",
      }}/>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main content — shifts right on desktop based on sidebar width */}
      <div
        id="dashboard-scroll-area"
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          marginLeft: 0,   // mobile: no margin (sidebar is a drawer)
          overflowY: "auto",
          overflowX: "hidden",
          // desktop margin transitions with sidebar width
          transition: "margin-left 280ms cubic-bezier(0.4,0,0.2,1)",
        }}
        // We apply the desktop margin via a className trick + inline override
        // Using inline style for the responsive breakpoint dynamically:
        // On lg+ screens apply marginLeft = sidebar width
        // We handle this with a small inline <style> tag below
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ flex: 1, padding: "24px 24px 48px" }}>{children}</main>
      </div>

      {/* Dynamic desktop margin — injected as a style tag so transition works */}
      <style>{`
        @media (min-width: 1024px) {
          #dashboard-scroll-area {
            margin-left: ${hydrated ? marginLeft : SIDEBAR_W_EXPANDED}px !important;
          }
        }
      `}</style>
    </div>
  );
}
