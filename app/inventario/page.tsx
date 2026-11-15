import { Suspense } from 'react';
import InventoryContent from '@/components/inventory/inventario-content';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default function InventarioPage({ searchParams }: Props) {
  return <Suspense fallback={<main className="p-8 text-slate-500">Cargando inventario...</main>}><InventoryContent searchParams={searchParams}/></Suspense>;
}
