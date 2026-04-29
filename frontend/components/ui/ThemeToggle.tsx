'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved === 'dark' || (!saved && prefersDark);
    setDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="font-mono text-xs text-ink/40 dark:text-platinum/30 hover:text-ink dark:hover:text-platinum transition-colors border border-ink/15 dark:border-white/8 px-2 py-1"
      aria-label="Toggle theme"
    >
      {dark ? '[ LIGHT MODE ]' : '[ DARK MODE ]'}
    </button>
  );
}
