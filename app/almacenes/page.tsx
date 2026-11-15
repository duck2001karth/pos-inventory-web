import { Suspense } from 'react';
import WarehousesContent from '@/components/warehouses/warehouses-content';
import PageLoading from '@/components/ui/page-loading';

export default function AlmacenesPage() {
  return (
    <Suspense fallback={<PageLoading label="Cargando almacenes..." />}>
      <WarehousesContent />
    </Suspense>
  );
}
