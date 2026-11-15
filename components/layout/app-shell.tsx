'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight, LogOut,
  Menu, PanelLeftClose, PanelLeftOpen, ScanLine, X,
} from 'lucide-react';
import ThemeSwitcher from './theme-switcher';
import { isNavigationActive, navigationGroups } from './navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const mobileButton = useRef<HTMLButtonElement>(null);
  const mobileClose = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('pos-sidebar-collapsed');
    setCollapsed(saved === 'yes');
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const before = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    mobileClose.current?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
      if (e.key !== 'Tab' || !panelRef.current) return;
      const els = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener('keydown', keydown);
      previousFocus?.focus();
    };
  }, [mobileOpen]);

  const activeLabel = navigationGroups.flatMap(g => g.items)
    .find(item => isNavigationActive(pathname, item.href))?.label ?? 'POS Control';

  function toggleCollapsed() {
    setCollapsed(prev => {
      window.localStorage.setItem('pos-sidebar-collapsed', prev ? 'no' : 'yes');
      return !prev;
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
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : 'Error al cerrar sesión.');
    } finally {
      setLogoutLoading(false);
    }
  }

  function Sidebar({ mini, mobile }: { mini: boolean; mobile: boolean }) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#0b1328] text-white">
        <div className={`flex h-[82px] shrink-0 items-center border-b border-white/10 ${mini ? 'justify-center px-2' : 'gap-3 px-5'}`}>
          <Link href="/dashboard" aria-label="Ir al dashboard" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/30">
            <ScanLine size={23} aria-hidden="true" />
          </Link>
          {!mini && (
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold tracking-tight">POS Control</p>
              <p className="text-[11px] text-slate-400">Gestión de dispositivos</p>
            </div>
          )}
          {mobile && (
            <button ref={mobileClose} type="button" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
              <X size={20} />
            </button>
          )}
        </div>

        {!mini && (
          <Link href="/inventario" className="mx-3 mt-5 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-600/20 to-cyan-400/5 px-4 py-3 transition hover:border-blue-400/40">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-blue-200">Centro de operaciones</p>
              <p className="mt-1 text-sm font-semibold text-white">Explorar inventario</p>
            </div>
            <ChevronRight className="shrink-0 text-blue-200" size={18} />
          </Link>
        )}

        <nav aria-label="Navegación principal" className="mt-4 flex-1 space-y-6 overflow-y-auto px-3 pb-5">
          {navigationGroups.map(group => (
            <section key={group.title}>
              {!mini && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">{group.title}</p>}
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isNavigationActive(pathname, item.href);
                  const base = `relative flex w-full items-center rounded-xl py-3 text-sm transition-colors ${mini ? 'justify-center px-2' : 'gap-3 px-3.5'}`;
                  if (!item.enabled) return (
                    <div key={item.href} title={`${item.label} · Próximamente`} aria-disabled="true" className={`${base} cursor-not-allowed text-slate-600`}>
                      <Icon size={19} aria-hidden="true" />
                      {!mini && <><span className="min-w-0 flex-1">{item.label}</span><span className="text-[10px]">Pronto</span></>}
                    </div>
                  );
                  return (
                    <Link key={item.href} href={item.href} title={mini ? item.label : undefined} aria-label={mini ? item.label : undefined} aria-current={active ? 'page' : undefined} onClick={() => setMobileOpen(false)} className={`${base} ${active ? 'bg-blue-600 font-semibold text-white shadow-md shadow-blue-950/30' : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400`}>
                      <Icon size={19} aria-hidden="true" />
                      {!mini && <span className="min-w-0 flex-1">{item.label}</span>}
                      {active && <span className="absolute -left-2 top-3 h-5 w-0.5 rounded-full bg-cyan-300" />}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="shrink-0 space-y-3 border-t border-white/10 p-3">
          {!mini && <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Apariencia</p>}
          <ThemeSwitcher compact={mini} />
          {logoutError && !mini && <p role="alert" className="rounded-lg bg-red-900/40 p-2 text-xs text-red-200">{logoutError}</p>}
          <button type="button" onClick={() => void logout()} disabled={logoutLoading} title={mini ? 'Cerrar sesión' : undefined} className={`flex w-full items-center rounded-xl py-2.5 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50 ${mini ? 'justify-center px-2' : 'gap-3 px-3'}`}>
            <LogOut size={19} />{!mini && (logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión')}
          </button>
          {!mini && <p className="px-3 text-[10px] text-slate-600">POS Inventory · v1.0</p>}
        </div>
      </div>
    );
  }

  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] transition-colors">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block ${collapsed ? 'w-[82px]' : 'w-[272px]'}`}>
        <Sidebar mini={collapsed} mobile={false} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Cerrar menú" tabIndex={-1} onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/70" />
          <aside ref={panelRef} aria-label="Menú móvil" className="absolute inset-y-0 left-0 w-[min(88vw,325px)] shadow-2xl">
            <Sidebar mini={false} mobile />
          </aside>
        </div>
      )}

      <div className={`min-w-0 transition-[padding] duration-200 ${collapsed ? 'lg:pl-[82px]' : 'lg:pl-[272px]'}`}>
        <header className="sticky top-0 z-30 flex h-[70px] items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)]/95 px-4 backdrop-blur md:px-7">
          <button ref={mobileButton} type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" aria-expanded={mobileOpen} className="rounded-xl border border-[var(--app-border)] p-2.5 hover:bg-[var(--app-hover)] lg:hidden"><Menu size={21} /></button>
          <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'} title={collapsed ? 'Expandir menú' : 'Contraer menú'} className="hidden rounded-xl border border-[var(--app-border)] p-2.5 hover:bg-[var(--app-hover)] lg:block">
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)]">POS Inventory</p>
            <p className="truncate text-sm font-semibold">{activeLabel}</p>
          </div>
          <Link href="/inventario/registrar" className="hidden rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:inline-flex">+ Registrar POS</Link>
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
