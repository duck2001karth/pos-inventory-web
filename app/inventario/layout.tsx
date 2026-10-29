
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';

async function ProtectedContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}

export default function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <main className="p-8">Verificando sesión...</main>
    }>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}
