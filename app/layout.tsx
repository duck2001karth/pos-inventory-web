
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';

import AppShell from '@/components/layout/app-shell';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'POS Control',
    template: '%s | POS Control',
  },
  description:
    'Sistema de inventario y trazabilidad de dispositivos POS.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

function ShellFallback() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 bg-slate-950 lg:block">
        <div className="p-6 text-lg font-bold text-white">
          POS Control
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-500">
          Cargando POS Control...
        </p>
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <Suspense fallback={<ShellFallback />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
