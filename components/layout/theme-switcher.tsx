'use client';

import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';
const KEY = 'pos-control-theme';
const choices = [
  { id: 'light' as const, label: 'Claro', icon: Sun },
  { id: 'dark' as const, label: 'Oscuro', icon: Moon },
  { id: 'system' as const, label: 'Sistema', icon: Monitor },
];

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('light');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    const initial: Theme = saved === 'dark' || saved === 'system' ? saved : 'light';
    setTheme(initial);
    applyTheme(initial);
    const query = matchMedia('(prefers-color-scheme: dark)');
    const handle = () => {
      const current = localStorage.getItem(KEY);
      if (current === 'system') applyTheme('system');
    };
    query.addEventListener('change', handle);
    return () => query.removeEventListener('change', handle);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(KEY, next);
    applyTheme(next);
    setOpen(false);
  }

  const ActiveIcon = choices.find((c) => c.id === theme)?.icon ?? Sun;

  return (
    <div className="relative">
      <button type="button" title="Cambiar apariencia" aria-label="Cambiar apariencia" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(!open)} className="app-icon-button">
        <ActiveIcon size={19} />
      </button>
      {open && (
        <>
          <button type="button" tabIndex={-1} aria-label="Cerrar selector de apariencia" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" aria-label="Elegir apariencia" className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-xl">
            {choices.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="menuitemradio" aria-checked={theme === id} onClick={() => choose(id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--app-fg)] hover:bg-[var(--app-hover)]">
                <Icon size={17} className="text-[var(--app-muted)]" /><span className="flex-1">{label}</span>{theme === id && <Check size={16} className="text-[var(--app-accent)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
