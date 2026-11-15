'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen,
  ScanLine, X,
} from 'lucide-react';

import ThemeSwitcher from './theme-switcher';
import { isNavigationActive, navigationGroups } from './navigation';

type SidebarProps = {
  pathname: string;
  compact: boolean;
  mobile?: boolean;
  pinned?: boolean;
  logoutLoading: boolean;
  logoutError: string;
  onClose: () => void;
  onTogglePin: () => void;
  onLogout: () => void;
  closeButtonRef?: React.Ref<HTMLButtonElement>;
};

function Sidebar({
  pathname, compact, mobile = false, pinned = false,
  logoutLoading, logoutError, onClose, onTogglePin, onLogout,
  closeButtonRef,
}: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b1328] text-white">
      <div className={`flex h-[76px] shrink-0 items-center border-b border-white/10 ${compact ? 'justify-center px-2' : 'gap-3 px-4'}`}>
        <Link
          href="/dashboard" onClick={onClose} aria-label="Ir al dashboard"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30"
        >
          <ScanLine size={23} />
        </Link>
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tracking-tight">POS Control</p>
            <p className="text-[11px] text-slate-400">Gestión de dispositivos</p>
          </div>
        )}
        {mobile && (
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
            <X size={20} />
          </button>
        )}
      </div>

      {!mobile && !compact && (
        <button type="button" onClick={onTogglePin}
          aria-pressed={pinned} title={pinned ? 'Desfijar menú' : 'Mantener menú abierto'}
          className="mx-3 mt-3 flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/10">
          {pinned ? 'Mantener menú compacto' : 'Fijar menú abierto'}
          {pinned ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>
      )}
      {!mobile && compact && (
        <button type="button" onClick={onTogglePin} title="Fijar menú abierto"
          aria-label="Fijar menú abierto"
          className="mx-auto mt-3 rounded-xl p-3 text-slate-400 hover:bg-white/10 hover:text-white">
          <PanelLeftOpen size={19} />
        </button>
      )}

      {!compact && (
        <Link href="/inventario" onClick={onClose}
          className="mx-3 mt-3 flex items-center justify-between rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-3 transition hover:bg-blue-500/20">
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-wider text-blue-300">Centro de operaciones</span>
            <span className="mt-1 block text-sm font-semibold">Explorar inventario</span>
          </span>
          <ChevronRight size={18} className="text-blue-200" />
        </Link>
      )}

      <nav aria-label="Navegación principal"
        className={`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden pb-3 ${compact ? 'px-2' : 'px-3'}`}>
        {navigationGroups.map((group) => (
          <div key={group.title}>
            {!compact && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-slate-500">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavigationActive(pathname, item.href);
                const base = `relative flex min-h-11 w-full items-center rounded-xl text-sm transition-colors ${compact ? 'justify-center px-2' : 'gap-3 px-3 py-3'}`;
                if (!item.enabled) {
                  return (
                    <div key={item.href} aria-disabled="true" title={`${item.label} (próximamente)`}
                      className={`${base} cursor-not-allowed text-slate-600`}>
                      <Icon size={20} aria-hidden="true" />
                      {!compact && <><span className="min-w-0 flex-1">{item.label}</span><span className="text-[10px]">Pronto</span></>}
                    </div>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    aria-label={compact ? item.label : undefined}
                    title={compact ? item.label : undefined}
                    className={`${base} ${active ? 'bg-blue-600 font-semibold text-white shadow-sm' : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400`}>
                    <Icon size={20} aria-hidden="true" />
                    {!compact && <span className="min-w-0 flex-1">{item.label}</span>}
                    {active && <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-cyan-300" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 space-y-2 border-t border-white/10 ${compact ? 'p-2' : 'p-3'}`}>
        {!compact && <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Apariencia</p>}
        <ThemeSwitcher compact={compact} />
        {logoutError && !compact && <p role="alert" className="rounded-lg bg-red-900/30 p-2 text-xs text-red-200">{logoutError}</p>}
        <button type="button" disabled={logoutLoading} onClick={onLogout}
          title={compact ? 'Cerrar sesión' : undefined} aria-label={compact ? 'Cerrar sesión' : undefined}
          className={`flex min-h-11 w-full items-center rounded-xl text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50 ${compact ? 'justify-center' : 'gap-3 px-3'}`}>
          <LogOut size={19} />
          {!compact && (logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión')}
        </button>
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
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const mobilePanelRef = useRef<HTMLElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPinned(window.localStorage.getItem('pos-sidebar-pinned') === 'yes');
  }, []);

  useEffect(() => { setMobileOpen(false); setHovered(false); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    mobileCloseRef.current?.focus();
    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
      if (event.key !== 'Tab') return;
      const elements = mobilePanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeydown);
      previousFocus?.focus();
    };
  }, [mobileOpen]);

  function togglePinned() {
    setPinned(prev => {
      const next = !prev;
      window.localStorage.setItem('pos-sidebar-pinned', next ? 'yes' : 'no');
      return next;
    });
  }

  async function logout() {
    if (logoutLoading) return;
    setLogoutLoading(true);
    setLogoutError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('No se pudo cerrar la sesión.');
      setMobileOpen(false);
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Error al cerrar sesión.');
    } finally {
      setLogoutLoading(false);
    }
  }

  if (pathname === '/login') return <>{children}</>;

  const expanded = pinned || hovered || focused;
  const currentPage = navigationGroups.flatMap(g => g.items)
    .find(item => isNavigationActive(pathname, item.href))?.label ?? 'POS Control';

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <aside
        aria-label="Menú principal"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        className={`fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-white/10 shadow-xl transition-[width] duration-200 ease-out lg:block ${expanded ? 'w-[276px]' : 'w-[76px]'}`}
      >
        <Sidebar
          pathname={pathname} compact={!expanded} pinned={pinned}
          logoutLoading={logoutLoading} logoutError={logoutError}
          onClose={() => { setHovered(false); setFocused(false); }} onTogglePin={togglePinned} onLogout={() => void logout()}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" tabIndex={-1} aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/70" />
          <aside ref={mobilePanelRef} aria-label="Menú móvil" className="absolute inset-y-0 left-0 w-[min(88vw,325px)] shadow-2xl">
            <Sidebar pathname={pathname} mobile compact={false}
              logoutLoading={logoutLoading} logoutError={logoutError}
              onClose={() => setMobileOpen(false)} onTogglePin={togglePinned}
              onLogout={() => void logout()} closeButtonRef={mobileCloseRef}
            />
          </aside>
        </div>
      )}

      <div className={`min-w-0 transition-[padding-left] duration-200 ${pinned ? 'lg:pl-[276px]' : 'lg:pl-[76px]'}`}>
        <header className="sticky top-0 z-30 flex h-[70px] items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 md:px-7">
          <button ref={mobileTriggerRef} type="button" onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú" aria-expanded={mobileOpen}
            className="rounded-xl border border-[var(--app-border)] p-2.5 lg:hidden"><Menu size={21}/></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-[var(--app-muted)]">POS Inventory</p>
            <p className="truncate text-sm font-semibold">{currentPage}</p>
          </div>
          <Link href="/inventario/registrar" className="hidden rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:inline-flex">
            + Registrar POS
          </Link>
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
