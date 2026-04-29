import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      container: {
        center: true,
        padding: { DEFAULT: "1rem", md: "2rem", lg: "4rem" },
        screens: { "2xl": "1200px" },
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-tinted": "var(--surface-tinted)",
        progress: "var(--positive)",
        "progress-track": "var(--progress-track)",
        seeker: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff",
          soft: "var(--seeker-soft)",
          "soft-border": "var(--seeker-soft-border)",
        },
        recruiter: {
          DEFAULT: "#f97316",
          foreground: "#ffffff",
          soft: "var(--recruiter-soft)",
          "soft-border": "var(--recruiter-soft-border)",
        },
        // Industrial design tokens
        paper: "#fbfbf9",
        ink: "#111111",
        void: "#050505",
        pane: "#0d0e12",
        modal: "#16181d",
        platinum: "#e5e5e5",
        neon: "#00f0ff",
        "diff-red": "#ff4d4d",
        "diff-green": "#00c853",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "24px",
        md: "20px",
        sm: "16px",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        ring: "var(--shadow-ring)",
        craft: "0 8px 30px rgba(0,0,0,0.04)",
        "glass-button": "0 4px 6px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        glow: "0 0 20px rgba(0,0,0,0.1)",
        "card-hover": "0 20px 40px -12px rgba(0,0,0,0.1)",
      },
      backgroundImage: {
        "grid-light": "linear-gradient(to right, rgba(17,17,17,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,17,17,0.06) 1px, transparent 1px)",
        "grid-dark": "linear-gradient(to right, rgba(0,240,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "50px 50px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        "infinite-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        scan: {
          "0%": { top: "0%" },
          "50%": { top: "88%" },
          "100%": { top: "0%" },
        },
        flicker: {
          "0%": { opacity: "0" },
          "20%": { opacity: "1" },
          "40%": { opacity: "0.3" },
          "60%": { opacity: "1" },
          "80%": { opacity: "0.6" },
          "100%": { opacity: "1" },
        },
        "ghost-in": {
          from: { opacity: "0", filter: "blur(4px)" },
          to: { opacity: "1", filter: "blur(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        blob: "blob 7s infinite",
        "infinite-scroll": "infinite-scroll 40s linear infinite",
        scan: "scan 4s ease-in-out infinite",
        flicker: "flicker 0.35s steps(1) forwards",
        "ghost-in": "ghost-in 0.4s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
