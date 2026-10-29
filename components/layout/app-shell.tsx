
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import {
  ArrowLeftRight,
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScanLine,
  ShieldCheck,
  Warehouse,
  X,
} from 'lucide-react';

const navigation = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    label: 'Inventario',
    href: '/inventario',
    icon: Package,
    enabled: true,
  },
  {
    label: 'Registrar POS',
    href: '/inventario/registrar',
    icon: Camera,
    enabled: true,
  },
  {
    label: 'Lector QR / Barras',
    href: '/inventario/escaner',
    icon: ScanLine,
    enabled: true,
  },
  {
    label: 'Movimientos',
    href: '/movimientos',
    icon: ArrowLeftRight,
    enabled: false,
  },
  {
    label: 'Almacenes',
    href: '/almacenes',
    icon: Warehouse,
    enabled: false,
  },
  {
    label: 'Usuarios',
    href: '/usuarios',
    icon: ShieldCheck,
    enabled: false,
  },
] as const;

function isActiveRoute(
  pathname: string,
  href: string,
): boolean {
  // Las rutas más específicas deben tener su
  // propia selección, no activar "Inventario".
  if (href === '/inventario') {
    return (
      pathname === '/inventario' ||
      (
        pathname.startsWith('/inventario/') &&
        !pathname.startsWith('/inventario/registrar') &&
        !pathname.startsWith('/inventario/escaner')
      )
    );
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  const isLoginPage = pathname === '/login';

  const currentPage =
    navigation.find((item) =>
      isActiveRoute(pathname, item.href),
    )?.label ?? 'POS Control';

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    mobileCloseRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function logout() {
    if (loggingOut) return;

    setLogoutError('');
    setLoggingOut(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('No se pudo cerrar la sesión.');
      }

      setMenuOpen(false);
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : 'Error al cerrar la sesión.',
      );
    } finally {
      setLoggingOut(false);
    }
  }

  // Mantener el login sin sidebar.
  if (isLoginPage) {
    return <>{children}</>;
  }

  function sidebarContent() {
    return (
      <div className="flex h-full flex-col bg-slate-950 text-white">
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600">
            <ScanLine size={23} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight">
              POS Control
            </p>
            <p className="text-xs text-slate-400">
              Gestión de dispositivos
            </p>
          </div>
        </div>

        <div className="px-4 pt-6">
          <p className="px-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            Navegación
          </p>
        </div>

        <nav
          aria-label="Navegación principal"
          className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(
              pathname,
              item.href,
            );

            if (!item.enabled) {
              return (
                <div
                  key={item.href}
                  aria-disabled="true"
                  title="Disponible próximamente"
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-slate-500"
                >
                  <Icon
                    size={19}
                    className="shrink-0"
                    aria-hidden="true"
                  />

                  <span className="flex-1 text-sm">
                    {item.label}
                  </span>

                  <span className="text-[10px]">
                    Pronto
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={
                  active ? 'page' : undefined
                }
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon
                  size={19}
                  className="shrink-0"
                  aria-hidden="true"
                />

                <span className="min-w-0 flex-1">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          {logoutError && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-red-950 p-3 text-xs text-red-200"
            >
              {logoutError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          >
            <LogOut size={19} aria-hidden="true" />

            <span>
              {loggingOut
                ? 'Cerrando sesión...'
                : 'Cerrar sesión'}
            </span>
          </button>

          <p className="mt-3 px-4 text-xs text-slate-500">
            POS Inventory · v1.0
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar fijo en pantallas grandes */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebarContent()}
      </aside>

      {/* Barra superior para teléfonos y tablets */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          ref={mobileMenuButtonRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          aria-controls="pos-mobile-menu"
          className="rounded-xl p-2 text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <Menu size={25} />
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-2"
        >
          <ScanLine
            size={24}
            className="text-blue-600"
            aria-hidden="true"
          />

          <span className="text-lg font-bold tracking-tight">
            POS Control
          </span>
        </Link>

        <div aria-hidden="true" className="w-10" />
      </header>

      {/* Menú móvil */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Cerrar menú"
            onClick={() => {
              setMenuOpen(false);
              mobileMenuButtonRef.current?.focus();
            }}
            className="absolute inset-0 bg-slate-950/70"
          />

          <aside
            id="pos-mobile-menu"
            aria-label="Menú móvil"
            className="absolute inset-y-0 left-0 w-[min(85vw,320px)] shadow-2xl"
          >
            {sidebarContent()}
          </aside>

          <button
            ref={mobileCloseRef}
            type="button"
            onClick={() => {
              setMenuOpen(false);
              mobileMenuButtonRef.current?.focus();
            }}
            aria-label="Cerrar menú de navegación"
            className="absolute right-4 top-4 rounded-xl bg-white p-2 text-slate-900 shadow-md focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <X size={23} />
          </button>
        </div>
      )}

      {/* Área principal */}
      <div className="min-h-screen min-w-0 lg:pl-64">
        {/* Encabezado para laptop */}
        <div className="hidden border-b border-slate-200 bg-white px-8 py-5 lg:block">
          <p className="text-sm text-slate-600">
            POS Inventory
            <span className="mx-2 text-slate-300">/</span>
            <span className="font-semibold text-slate-900">
              {currentPage}
            </span>
          </p>
        </div>

        <div className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
