"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ─── Icons ──────────────────────────────────────────────────────────────────
const IconTarget = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6"/>
    <circle cx="12" cy="12" r="4.5" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6"/>
    <circle cx="12" cy="12" r="1.5" fill={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"}/>
  </svg>
);
const IconChat = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 4h16v12H7l-4 4V4z" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconBriefcase = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="2" y="7" width="20" height="14" rx="3" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconTracker = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
    <rect x="9" y="3" width="6" height="4" rx="1" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6"/>
    <path d="M9 12h6M9 16h4" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconCvBuilder = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="4" y="2" width="16" height="20" rx="2" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6"/>
    <path d="M8 7h8M8 11h8M8 15h5" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconInterview = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6"/>
    <path d="M2 20c0-4 4-7 10-7s10 3 10 7" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M17 13l2 2 4-4" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSettings = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 6h16" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="8" cy="6" r="2" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" fill="var(--sidebar-bg)"/>
    <path d="M4 12h16" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="16" cy="12" r="2" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" fill="var(--sidebar-bg)"/>
    <path d="M4 18h16" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="10" cy="18" r="2" stroke={active ? "var(--nav-active-text)" : "var(--nav-idle-text)"} strokeWidth="1.6" fill="var(--sidebar-bg)"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 6h16M4 12h16M4 18h16" stroke="var(--text-body)" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconPanelCollapse = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
    <rect x="1.5" y="1.5" width="17" height="17" rx="3" stroke="var(--text-body)" strokeWidth="1.5"/>
    <line x1="8.5" y1="1.5" x2="8.5" y2="18.5" stroke="var(--text-body)" strokeWidth="1.5"/>
  </svg>
);
const IconPanelExpand = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
    <rect x="1.5" y="1.5" width="17" height="17" rx="3" stroke="var(--text-body)" strokeWidth="1.5"/>
    <line x1="6.5" y1="1.5" x2="6.5" y2="18.5" stroke="var(--text-body)" strokeWidth="1.5"/>
  </svg>
);
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" stroke="var(--nav-active-text)" strokeWidth="1.8"/>
    <path d="M2 20c0-4 4-7 10-7s10 3 10 7" stroke="var(--nav-active-text)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconSignOut = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#EF4444" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M16 17l5-5-5-5" stroke="#EF4444" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H9" stroke="#EF4444" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const IconSettingsLine = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 6h16" stroke="var(--text-body)" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="8" cy="6" r="2" stroke="var(--text-body)" strokeWidth="1.7" fill="var(--surface)"/>
    <path d="M4 12h16" stroke="var(--text-body)" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="16" cy="12" r="2" stroke="var(--text-body)" strokeWidth="1.7" fill="var(--surface)"/>
    <path d="M4 18h16" stroke="var(--text-body)" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="10" cy="18" r="2" stroke="var(--text-body)" strokeWidth="1.7" fill="var(--surface)"/>
  </svg>
);

// ─── Constants ───────────────────────────────────────────────────────────────
const SIDEBAR_W_EXPANDED  = 240;
const SIDEBAR_W_COLLAPSED = 64;

type NavItem = { href: string; labelKey: string; Icon: React.FC<{ active: boolean }> };
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",                labelKey: "jobMatch",       Icon: IconTarget    },
  { href: "/dashboard/cv-builder",     labelKey: "resumeBuilder",  Icon: IconCvBuilder },
  { href: "/dashboard/chat",           labelKey: "aiCoach",        Icon: IconChat      },
  { href: "/dashboard/interview-prep", labelKey: "interviewPrep",  Icon: IconInterview },
  { href: "/dashboard/jobs",           labelKey: "browseJobs",     Icon: IconBriefcase },
  { href: "/dashboard/tracker",        labelKey: "applications",   Icon: IconTracker   },
];

const SIDEBAR_LABELS: Record<string, Record<"en" | "fr", string>> = {
  jobMatch:      { en: "Job Match",       fr: "Offres"            },
  resumeBuilder: { en: "Resume Builder",  fr: "CV Builder"        },
  aiCoach:       { en: "AI Career Coach", fr: "Coach IA"          },
  interviewPrep: { en: "Interview Prep",  fr: "Entretiens"        },
  browseJobs:    { en: "Browse Jobs",     fr: "Emplois"           },
  applications:  { en: "Applications",   fr: "Candidatures"       },
  settings:      { en: "Settings",        fr: "Paramètres"        },
  jobSeeker:     { en: "Job Seeker",      fr: "Chercheur d'emploi" },
  collapse:      { en: "Collapse",        fr: "Réduire"           },
  expand:        { en: "Expand",          fr: "Développer"        },
  userSettings:  { en: "Settings",        fr: "Paramètres"        },
  signOut:       { en: "Sign out",        fr: "Se déconnecter"    },
};

// ─── NavLink ─────────────────────────────────────────────────────────────────
function NavLink({
  href, label, Icon, active, collapsed, onClick,
}: {
  href: string; label: string; Icon: React.FC<{ active: boolean }>;
  active: boolean; collapsed: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        gap: 10, padding: "8px 10px", borderRadius: 10,
        textDecoration: "none", fontSize: 13.5, fontWeight: active ? 500 : 400,
        letterSpacing: "0.2px",
        color: active ? "var(--nav-active-text)" : "var(--nav-idle-text)",
        background: active ? "var(--nav-active-bg)" : "transparent",
        boxShadow: active
          ? "rgba(0,0,0,0.20) 0px 4px 12px -4px, rgba(255,255,255,0.08) 0px 1px 1px 0px inset"
          : "none",
        transition: "background 140ms ease, color 140ms ease",
        whiteSpace: "nowrap", overflow: "hidden", minHeight: 38,
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)";
          (e.currentTarget as HTMLElement).style.color = "var(--nav-hover-text)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--nav-idle-text)";
        }
      }}
    >
      <span style={{ flexShrink: 0, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon active={active} />
      </span>
      <span style={{
        overflow: "hidden", whiteSpace: "nowrap",
        maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1,
        transition: "max-width 260ms ease, opacity 160ms ease",
        display: "block",
      }}>{label}</span>
    </Link>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({
  open, onClose, collapsed, onToggleCollapse,
}: {
  open: boolean; onClose: () => void; collapsed: boolean; onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const lang = (locale === "fr" ? "fr" : "en") as "en" | "fr";
  const t = (key: string) => SIDEBAR_LABELS[key]?.[lang] ?? key;
  const w = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  return (
    <>
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
          position: "fixed", top: 0, left: 0, bottom: 0, width: w, zIndex: 50,
          display: "flex", flexDirection: "column",
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          borderRight: "1px solid var(--sidebar-border)",
          boxShadow: "2px 0 16px rgba(0,0,0,0.08)",
          transition: "width 260ms cubic-bezier(0.4,0,0.2,1), transform 280ms cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
        className={open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      >
        {/* Logo row */}
        <div style={{
          height: 60, flexShrink: 0,
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0 14px" : "0 10px 0 14px",
          borderBottom: "1px solid var(--sidebar-border)",
        }}>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}
            title="Krino"
          >
            <Image src="/logo.png" alt="Krino" width={34} height={34} priority style={{ objectFit: "contain", flexShrink: 0 }}/>
            <span style={{
              fontSize: 17, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em",
              overflow: "hidden", whiteSpace: "nowrap",
              maxWidth: collapsed ? 0 : 110, opacity: collapsed ? 0 : 1,
              transition: "max-width 260ms ease, opacity 180ms ease",
            }}>Krino</span>
          </Link>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex"
              title={t("collapse")}
              aria-label={t("collapse")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 6, borderRadius: 8,
                alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "background 120ms ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <IconPanelCollapse />
            </button>
          )}
        </div>

        {collapsed && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex"
              title={t("expand")}
              aria-label={t("expand")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 6, borderRadius: 8,
                alignItems: "center", justifyContent: "center",
                transition: "background 120ms ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <IconPanelExpand />
            </button>
          </div>
        )}

        {/* Section label */}
        <div style={{
          padding: collapsed ? "10px 0 4px" : "18px 18px 6px",
          display: "flex", justifyContent: collapsed ? "center" : "flex-start",
        }}>
          {collapsed
            ? <div style={{ width: 24, height: 1, background: "var(--sidebar-section)", borderRadius: 1 }}/>
            : <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)", whiteSpace: "nowrap" }}>{t("jobSeeker")}</span>
          }
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", overflowX: "hidden" }}>
          {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <NavLink
                key={href}
                href={href}
                label={t(labelKey)}
                Icon={Icon}
                active={active}
                collapsed={collapsed}
                onClick={onClose}
              />
            );
          })}
        </nav>

        {/* Settings row at bottom */}
        <div style={{ padding: "8px 8px 14px", borderTop: "1px solid var(--sidebar-border)" }}>
          <NavLink
            href="/dashboard/settings"
            label={t("settings")}
            Icon={IconSettings}
            active={pathname === "/dashboard/settings"}
            collapsed={collapsed}
            onClick={onClose}
          />
        </div>
      </aside>
    </>
  );
}

// ─── Avatar user menu ─────────────────────────────────────────────────────────
function AvatarMenu() {
  const { email, logout } = useAuth();
  const router = useRouter();
  const { locale } = useLanguage();
  const lang = (locale === "fr" ? "fr" : "en") as "en" | "fr";
  const t = (key: string) => SIDEBAR_LABELS[key]?.[lang] ?? key;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleOutside = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  };
  const openMenu = () => {
    setOpen(true);
    document.addEventListener("mousedown", handleOutside, { once: true });
  };

  const initial = email ? email[0].toUpperCase() : "?";

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
    router.push("/auth/sign-in");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label="User menu"
        style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "var(--nav-active-bg)",
          border: "1.5px solid var(--sidebar-border)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 600, color: "var(--nav-active-text)", letterSpacing: "0.03em",
          flexShrink: 0, transition: "opacity 140ms ease",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.82"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        {email ? initial : <IconUser />}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 210,
          background: "var(--surface)",
          border: "1px solid var(--sidebar-border)",
          borderRadius: 12, boxShadow: "var(--shadow-card)",
          zIndex: 200, overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--sidebar-border)" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--nav-active-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600, color: "var(--nav-active-text)", marginBottom: 8,
            }}>{initial}</div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{email ?? "—"}</p>
          </div>
          <div style={{ padding: "6px 6px" }}>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
                textDecoration: "none", fontSize: 13.5, color: "var(--text-body)", transition: "background 120ms ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <IconSettingsLine />
              {t("userSettings")}
            </Link>
            <button
              onClick={handleSignOut}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
                width: "100%", background: "none", border: "none", cursor: "pointer",
                fontSize: 13.5, color: "#EF4444", textAlign: "left", transition: "background 120ms ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <IconSignOut />
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const lang = (locale === "fr" ? "fr" : "en") as "en" | "fr";
  const t = (key: string) => SIDEBAR_LABELS[key]?.[lang] ?? key;

  const activeItem = NAV_ITEMS.find(
    n => n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href))
  );
  const pageTitle = activeItem ? t(activeItem.labelKey) : "Dashboard";

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30, height: 60, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px",
      background: "var(--topbar-bg)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--topbar-border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onMenuClick}
          className="lg:hidden"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{pageTitle}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ThemeToggle variant="icon" />
        <LanguageSwitcher />
        <AvatarMenu />
      </div>
    </header>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const pathname = usePathname();

  const isCvBuilderEditor = /^\/dashboard\/cv-builder\/[^/]+/.test(pathname);
  if (isCvBuilderEditor) return <>{children}</>;

  const sidebarW = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--layout-bg)", display: "flex", flexDirection: "column" }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: 0 }}
        ref={(el) => { if (el) el.style.marginLeft = `${sidebarW}px`; }}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main
          id="dashboard-scroll-area"
          style={{ flex: 1, overflowY: "auto", padding: "24px 24px 48px" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
