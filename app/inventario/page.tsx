import { Suspense } from 'react';
import InventoryContent from '@/components/inventory/inventario-content';
import PageLoading from '@/components/ui/page-loading';
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default function InventoryPage({ searchParams }: Props) {
  return <Suspense fallback={<PageLoading label="Cargando inventario..." />}><InventoryContent searchParams={searchParams} /></Suspense>;
}
