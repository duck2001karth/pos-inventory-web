
import { Suspense } from 'react';

import InventoryContent from '@/components/inventory/inventario-content';

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
  }>;
};

export default function InventarioPage({
  searchParams,
}: Props) {
  return (
    <Suspense
      fallback={
        <main className="p-6 text-slate-500">
          Cargando inventario...
        </main>
      }
    >
      <InventoryContent searchParams={searchParams} />
    </Suspense>
  );
}
