import {
  ArrowLeftRight,
  Camera,
  LayoutDashboard,
  Package,
  ScanLine,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';

export const navigationGroups = [
  {
    title: 'General',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, enabled: true },
      { label: 'Inventario', href: '/inventario', icon: Package, enabled: true },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { label: 'Registrar POS', href: '/inventario/registrar', icon: Camera, enabled: true },
      { label: 'Lector QR / Barras', href: '/inventario/escaner', icon: ScanLine, enabled: true },
      { label: 'Movimientos', href: '/movimientos', icon: ArrowLeftRight, enabled: false },
    ],
  },
  {
    title: 'Administración',
    items: [
      { label: 'Almacenes', href: '/almacenes', icon: Warehouse, enabled: false },
      { label: 'Usuarios', href: '/usuarios', icon: ShieldCheck, enabled: false },
    ],
  },
] as const;

export function isNavigationActive(pathname: string, href: string): boolean {
  if (href === '/inventario') {
    return pathname === href ||
      (pathname.startsWith('/inventario/') &&
        !pathname.startsWith('/inventario/registrar') &&
        !pathname.startsWith('/inventario/escaner'));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
