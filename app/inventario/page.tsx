
import { Suspense } from 'react';
import InventarioContent from '../../components/inventory/inventario-content';

export default function InventarioPage() {
  return (
    <Suspense fallback={
      <main className="p-8">
        Cargando inventario...
      </main>
    }>
      <InventarioContent />
    </Suspense>
  );
}
