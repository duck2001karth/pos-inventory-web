import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/layout/app-shell';
import PageLoading from '@/components/ui/page-loading';
import './globals.css';
export const metadata: Metadata = { title: { default: 'POS Control', template: '%s | POS Control' }, description: 'Gestión e inventario de dispositivos POS.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="min-h-screen antialiased"><Suspense fallback={<PageLoading label="Preparando POS Control..." />}><AppShell>{children}</AppShell></Suspense></body></html>;
}
