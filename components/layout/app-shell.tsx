
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
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
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const currentPage =
    navigation.find((item) => item.href === pathname)?.label ??
    'POS Control';

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('No se pudo cerrar sesión');
      }

      setMenuOpen(false);
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      setLoggingOut(false);
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
          <ScanLine size={24} />
        </div>

        <div>
          <p className="text-lg font-bold">POS Control</p>
          <p className="text-xs text-slate-400">
            Gestión de dispositivos
          </p>
        </div>
      </div>

      <div className="px-4 pt-6">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Navegación
        </p>
      </div>

      <nav aria-label="Navegación principal" className="mt-3 flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href ||
            (item.href === '/inventario' &&
              pathname.startsWith('/inventario/') &&
              pathname !== '/inventario/registrar');

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-slate-500"
                title="Disponible próximamente"
              >
                <Icon size={19} />
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="text-[10px]">Pronto</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => void logout()}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
        >
          <LogOut size={19} />
          {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>

        <p className="mt-3 px-4 text-xs text-slate-500">
          POS Inventory · v1.0
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar en laptop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebarContent}
      </aside>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          aria-controls="pos-mobile-menu"
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2">
          <ScanLine className="text-blue-600" size={22} />
          <span className="font-bold">POS Control</span>
        </div>

        <span className="w-10" />
      </header>

      {/* Menú desplegable móvil */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />

          <aside
            id="pos-mobile-menu"
            className="absolute inset-y-0 left-0 w-[min(85vw,320px)]"
          >
            {sidebarContent}
          </aside>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            className="absolute right-4 top-4 rounded-lg bg-white p-2 text-slate-900"
          >
            <X size={22} />
          </button>
        </div>
      )}

      {/* Contenido de cada página */}
      <div className="min-h-screen lg:pl-64">
        <div className="hidden border-b border-slate-200 bg-white px-8 py-5 lg:block">
          <p className="text-sm font-medium text-slate-600">
            POS Inventory / {currentPage}
          </p>
        </div>

        <div className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
