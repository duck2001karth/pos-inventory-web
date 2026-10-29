
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
} from 'lucide-react';

import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import {
  INVENTORY_PAGE_SIZE,
  inventorySelect,
  inventoryWhere,
} from '@/lib/services/inventory-query';

import type { InventoryDevice } from '@/types/inventory';

import InventorySearch from '@/components/inventory/inventory-search';
import InventoryTable from '@/components/inventory/inventory-table';

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
  }>;
};

function pageUrl(page: number, q: string) {
  const params = new URLSearchParams();

  params.set('page', String(page));

  if (q) {
    params.set('q', q);
  }

  return `/inventario?${params.toString()}`;
}

export default async function InventoryContent({
  searchParams,
}: Props) {
  const user = await requireUser();
  const params = await searchParams;

  const rawSearch = Array.isArray(params.q)
    ? params.q[0]
    : params.q;

  const q = (rawSearch ?? '').trim().slice(0, 100);

  const rawPage = Array.isArray(params.page)
    ? params.page[0]
    : params.page;

  const pageNumber = Number(rawPage ?? 1);

  const requestedPage =
    Number.isSafeInteger(pageNumber) && pageNumber > 0
      ? pageNumber
      : 1;

  const where = inventoryWhere(q);

  const [
    total,
    inStock,
    assigned,
    inRepair,
    matches,
  ] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({
      where: { status: 'IN_STOCK' },
    }),
    prisma.device.count({
      where: { status: 'ASSIGNED' },
    }),
    prisma.device.count({
      where: { status: 'IN_REPAIR' },
    }),
    prisma.device.count({ where }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(matches / INVENTORY_PAGE_SIZE),
  );

  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.device.findMany({
    where,
    select: inventorySelect,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    skip: (page - 1) * INVENTORY_PAGE_SIZE,
    take: INVENTORY_PAGE_SIZE,
  });

  // Convertimos las fechas a texto para pasar
  // datos serializables al componente interactivo.
  const devices: InventoryDevice[] = rows.map((item) => ({
    id: item.id,
    internalCode: item.internalCode,
    serialNumber: item.serialNumber,
    imei: item.imei,
    imei2: item.imei2,
    status: item.status,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    model: {
      brand: item.model.brand,
      model: item.model.model,
    },
    currentLocation: {
      code: item.currentLocation.code,
      name: item.currentLocation.name,
    },
  }));

  const canExport =
    user.role === 'ADMIN' ||
    user.role === 'INVENTORY_MANAGER';

  const exportUrl = q
    ? `/api/reports/inventory?q=${encodeURIComponent(q)}`
    : '/api/reports/inventory';

  const stats = [
    ['Total de POS', total],
    ['En almacén', inStock],
    ['Asignados', assigned],
    ['En reparación', inRepair],
  ] as const;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 pb-12 text-slate-900 md:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-600">
            Sistema de inventario POS
          </p>

          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            Inventario de dispositivos
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Consulta S/N, IMEI 1, IMEI 2, modelo,
            estado y ubicación de cada POS.
          </p>
        </div>

        <Link
          href="/inventario/registrar"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={19} />
          Registrar POS
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">
              {label}
            </p>

            <p className="mt-2 text-3xl font-bold">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-4 md:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">
                Dispositivos registrados
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {matches} dispositivo(s) encontrado(s)
              </p>
            </div>

            {canExport && (
              <a
                href={exportUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Download size={18} />
                Exportar Excel
              </a>
            )}
          </div>

          <InventorySearch initialSearch={q} />

          <p className="text-xs text-slate-500">
            Pulsa un dispositivo para abrir su ficha completa.
            En celulares puedes desplazar la tabla horizontalmente.
          </p>
        </div>

        <InventoryTable devices={devices} />

        <footer className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Página {page} de {totalPages} ·{' '}
            {matches} registros ·{' '}
            {INVENTORY_PAGE_SIZE} por página
          </p>

          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageUrl(page - 1, q)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
              >
                <ChevronLeft size={16} />
                Anterior
              </Link>
            ) : (
              <span className="rounded-lg border px-3 py-2 text-sm text-slate-400">
                Anterior
              </span>
            )}

            {page < totalPages ? (
              <Link
                href={pageUrl(page + 1, q)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
              >
                Siguiente
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span className="rounded-lg border px-3 py-2 text-sm text-slate-400">
                Siguiente
              </span>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}
