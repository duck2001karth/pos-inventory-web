'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, ScanLine, X } from 'lucide-react';
import ThemeSwitcher from './theme-switcher';
import { isNavigationActive, navigationGroups } from './navigation';

type SidebarProps = {
  pathname: string;
  expanded: boolean;
  mobile?: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  pinned: boolean;
};

function Sidebar({ pathname, expanded, mobile = false, onClose, onTogglePin, pinned }: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--app-sidebar)] text-[var(--app-sidebar-fg)]">
      <Link href="/dashboard" onClick={onClose} aria-label="Ir al dashboard" className={`flex h-[74px] shrink-0 items-center border-b border-[var(--app-border)] ${expanded ? 'gap-3 px-4' : 'justify-center px-2'}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e94c62] text-white shadow-sm"><ScanLine size={22} /></span>
        {expanded && <span className="min-w-0"><span className="block text-base font-bold tracking-tight">POS Control</span><span className="block text-[11px] text-[var(--app-muted)]">Inventario inteligente</span></span>}
      </Link>
      <nav aria-label="Navegación principal" className={`min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${expanded ? 'px-3' : 'px-2'}`}>
        {navigationGroups.map((group) => (
          <div key={group.title}>
            {expanded && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--app-muted)]">{group.title}</p>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavigationActive(pathname, item.href);
                const classes = `relative flex min-h-[46px] w-full items-center rounded-xl text-sm transition-colors ${expanded ? 'gap-3 px-3.5' : 'justify-center px-2'} ${active ? 'bg-[var(--app-accent-soft)] font-semibold text-[var(--app-accent)]' : 'text-[var(--app-sidebar-fg)] hover:bg-[var(--app-hover)]'}`;
                if (!item.enabled) return <div key={item.href} title={`${item.label} · Próximamente`} aria-disabled="true" className={`${classes} opacity-40`}><Icon size={20} aria-hidden="true" />{expanded && <><span className="min-w-0 flex-1">{item.label}</span><span className="text-[10px]">Pronto</span></>}</div>;
                return <Link key={item.href} href={item.href} prefetch={false} title={!expanded ? item.label : undefined} aria-label={!expanded ? item.label : undefined} aria-current={active ? 'page' : undefined} onClick={onClose} className={`${classes} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]`}>
                  {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[var(--app-accent)]" />}
                  <Icon size={20} aria-hidden="true" />{expanded && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                </Link>;
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[var(--app-border)] p-2">
        {!mobile && <button type="button" onClick={onTogglePin} aria-label={pinned ? 'Desfijar menú' : 'Fijar menú abierto'} title={pinned ? 'Desfijar menú' : 'Fijar menú abierto'} className={`flex min-h-11 w-full items-center rounded-xl text-sm text-[var(--app-muted)] hover:bg-[var(--app-hover)] ${expanded ? 'gap-3 px-3' : 'justify-center'}`}>
          {pinned ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>} {expanded && <span>{pinned ? 'Menú automático' : 'Fijar menú abierto'}</span>}
        </button>}
        {mobile && <button type="button" onClick={onClose} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm"><X size={19}/> Cerrar menú</button>}
        {expanded && <p className="px-3 pb-1 pt-2 text-[10px] text-[var(--app-muted)]">POS Control · Gestión de equipos</p>}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setPinned(localStorage.getItem('pos-sidebar-pinned') === 'yes'); }, []);
  useEffect(() => { setMobileOpen(false); setHovered(false); }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
      if (e.key !== 'Tab') return;
      const items = panelRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', handle); previousFocus?.focus(); };
  }, [mobileOpen]);

  function togglePin() {
    setPinned(old => { const next = !old; localStorage.setItem('pos-sidebar-pinned', next ? 'yes' : 'no'); return next; });
  }
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) throw new Error('No se pudo cerrar sesión.');
      setMobileOpen(false); router.replace('/login'); router.refresh();
    } catch (err) { setLogoutError(err instanceof Error ? err.message : 'Error de conexión.'); }
    finally { setLoggingOut(false); }
  }

  if (pathname === '/login') return <>{children}</>;
  const expanded = pinned || hovered || focused;
  const activeLabel = navigationGroups.flatMap(group => group.items).find(item => isNavigationActive(pathname, item.href))?.label ?? 'POS Control';

  return <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
    <aside aria-label="Menú principal" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}
      className={`fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-[var(--app-border)] shadow-[4px_0_24px_rgba(0,0,0,.025)] transition-[width] duration-200 lg:block ${expanded ? 'w-[252px]' : 'w-[72px]'}`}>
      <Sidebar pathname={pathname} expanded={expanded} pinned={pinned} onClose={() => { setHovered(false); setFocused(false); }} onTogglePin={togglePin}/>
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" tabIndex={-1} aria-label="Cerrar menú" className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)}/>
      <aside ref={panelRef} aria-label="Menú móvil" className="absolute inset-y-0 left-0 w-[min(86vw,300px)] shadow-2xl">
        <Sidebar pathname={pathname} expanded mobile pinned={pinned} onTogglePin={togglePin} onClose={() => setMobileOpen(false)}/>
      </aside>
    </div>}
    <div className={`min-w-0 transition-[padding-left] duration-200 ${pinned ? 'lg:pl-[252px]' : 'lg:pl-[72px]'}`}>
      <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 md:px-6">
        <button ref={launcherRef} type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" aria-expanded={mobileOpen} className="app-icon-button lg:hidden"><Menu size={20}/></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--app-muted)]">POS Control</p><p className="truncate text-sm font-semibold">{activeLabel}</p></div>
        <ThemeSwitcher />
        <button type="button" title="Cerrar sesión" aria-label="Cerrar sesión" disabled={loggingOut} onClick={() => void logout()} className="app-icon-button hover:!text-red-500 disabled:opacity-40"><LogOut size={19}/></button>
      </header>
      {logoutError && <div role="alert" className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{logoutError}</div>}
      <div className="min-w-0">{children}</div>
    </div>
  </div>;
}
