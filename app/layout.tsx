
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
