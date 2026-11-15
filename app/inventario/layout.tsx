import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import PageLoading from '@/components/ui/page-loading';

async function Protected({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading label="Verificando sesión..." />}><Protected>{children}</Protected></Suspense>;
}
