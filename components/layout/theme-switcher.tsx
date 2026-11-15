'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'pos-control-theme';
const options: { id: Theme; title: string; icon: typeof Sun }[] = [
  { id: 'light', title: 'Claro', icon: Sun },
  { id: 'dark', title: 'Oscuro', icon: Moon },
  { id: 'system', title: 'Sistema', icon: Monitor },
];

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') setTheme(saved);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
    };
    apply();
    media.addEventListener('change', apply);
    window.localStorage.setItem(STORAGE_KEY, theme);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return (
    <div aria-label="Apariencia" className={`flex gap-1 rounded-xl bg-white/5 p-1 ${compact ? 'flex-col' : ''}`}>
      {options.map(({ id, title, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={`Tema ${title.toLowerCase()}`}
          aria-pressed={theme === id}
          title={title}
          onClick={() => setTheme(id)}
          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-blue-400 ${theme === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
          <Icon size={16} aria-hidden="true" />
          {!compact && <span>{title}</span>}
        </button>
      ))}
    </div>
  );
}
