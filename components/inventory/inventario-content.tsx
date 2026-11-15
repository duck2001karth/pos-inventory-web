import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { INVENTORY_PAGE_SIZE, inventorySelect, inventoryWhere, inventoryUrl, parseInventoryFilters } from '@/lib/services/inventory-query';
import type { InventoryDevice } from '@/types/inventory';
import InventoryFilters from '@/components/inventory/list/inventory-filters';
import InventoryTable from '@/components/inventory/list/inventory-table';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function InventoryContent({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseInventoryFilters(params);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage ?? 1);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = inventoryWhere(filters);
  const [total, inStock, assigned, inRepair, withNotes, withoutNotes, matches] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({ where: { status: 'IN_STOCK' } }),
    prisma.device.count({ where: { status: 'ASSIGNED' } }),
    prisma.device.count({ where: { status: 'IN_REPAIR' } }),
    prisma.device.count({ where: { AND: [{ notes: { not: null } }, { notes: { not: '' } }] } }),
    prisma.device.count({ where: { OR: [{ notes: null }, { notes: '' }] } }),
    prisma.device.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(matches / INVENTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rows = await prisma.device.findMany({ where, select: inventorySelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * INVENTORY_PAGE_SIZE, take: INVENTORY_PAGE_SIZE });
  const devices: InventoryDevice[] = rows.map(d => ({ id: d.id, internalCode: d.internalCode, serialNumber: d.serialNumber, imei: d.imei, imei2: d.imei2, status: d.status, notes: d.notes, createdAt: d.createdAt.toISOString(), model: d.model, currentLocation: d.currentLocation }));
  const canExport = user.role === 'ADMIN' || user.role === 'INVENTORY_MANAGER';
  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set('q', filters.q);
  if (filters.model) exportParams.set('model', filters.model);
  if (filters.status) exportParams.set('status', filters.status);
  if (filters.observations !== 'all') exportParams.set('observations', filters.observations);
  return <main className="mx-auto max-w-7xl space-y-6 p-4 pb-12 text-slate-900 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Sistema de inventario POS</p><h1 className="mt-2 text-2xl font-bold md:text-3xl">Inventario de dispositivos</h1><p className="mt-1 text-sm text-slate-500">Busca, filtra y consulta cada equipo SUNMI.</p></div><Link href="/inventario/registrar" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"><Plus size={18}/>Registrar POS</Link></header>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{([['Total de POS',total],['En almacén',inStock],['Asignados',assigned],['En reparación',inRepair],['Con observaciones',withNotes],['Sin observaciones',withoutNotes]] as const).map(([name,count]) => <div key={name} className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{name}</p><p className="mt-2 text-2xl font-bold">{count}</p></div>)}</section>
    <section className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm md:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Dispositivos registrados</h2><p className="text-sm text-slate-500">{matches} resultado(s)</p></div>{canExport && <a href={`/api/reports/inventory${exportParams.size ? `?${exportParams}` : ''}`} className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700"><Download size={18}/>Exportar Excel</a>}</div><InventoryFilters key={JSON.stringify(filters)} initial={filters}/><InventoryTable devices={devices}/><nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm"><span className="text-slate-500">Página {page} de {totalPages} · {INVENTORY_PAGE_SIZE} por página</span><div className="flex gap-2">{page > 1 ? <Link className="rounded-lg border px-3 py-2" href={inventoryUrl(filters,page-1)}><ChevronLeft size={16} className="inline"/> Anterior</Link> : <span className="rounded-lg border px-3 py-2 text-slate-400">Anterior</span>}{page < totalPages ? <Link className="rounded-lg border px-3 py-2" href={inventoryUrl(filters,page+1)}>Siguiente <ChevronRight size={16} className="inline"/></Link> : <span className="rounded-lg border px-3 py-2 text-slate-400">Siguiente</span>}</div></nav></section>
  </main>;
}
