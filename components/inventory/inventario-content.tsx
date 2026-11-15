import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Plus, Warehouse, Smartphone, PackageCheck, Wrench, MessageSquareText, CheckCircle2 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { INVENTORY_PAGE_SIZE, inventorySelect, inventoryWhere, inventoryUrl, parseInventoryFilters } from '@/lib/services/inventory-query';
import type { InventoryDevice } from '@/types/inventory';
import InventoryFilters from '@/components/inventory/list/inventory-filters';
import InventoryTable from '@/components/inventory/list/inventory-table';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const metrics = [
  { label: 'Total de POS', icon: Smartphone, tint: 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' },
  { label: 'En almacén', icon: Warehouse, tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' },
  { label: 'Asignados', icon: PackageCheck, tint: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10' },
  { label: 'En reparación', icon: Wrench, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' },
  { label: 'Con observaciones', icon: MessageSquareText, tint: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' },
  { label: 'Sin observaciones', icon: CheckCircle2, tint: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10' },
];

export default async function InventoryContent({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseInventoryFilters(params);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const n = Number(rawPage ?? 1);
  const requestedPage = Number.isSafeInteger(n) && n > 0 ? n : 1;
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
  const values = [total, inStock, assigned, inRepair, withNotes, withoutNotes];

  return <main className="min-w-0 space-y-6 px-4 py-6 pb-12 sm:px-6 xl:px-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--app-accent)]">Control de dispositivos</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Inventario de POS</h1><p className="mt-1 text-sm text-[var(--app-muted)]">Consulta tus equipos, encuentra identificadores y filtra observaciones.</p></div>
      <Link href="/inventario/registrar" className="app-primary"><Plus size={18}/> Nuevo dispositivo</Link>
    </header>
    <section aria-label="Indicadores del inventario" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
      {metrics.map(({ label, icon: Icon, tint }, i) => <div key={label} className="app-panel flex min-w-0 flex-col gap-3 p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-[var(--app-muted)] sm:text-sm">{label}</p><span className={`rounded-xl p-2 ${tint}`}><Icon size={18}/></span></div><p className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{values[i].toLocaleString('es-BO')}</p></div>)}
    </section>
    <section className="app-panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-3 sm:px-6"><div><h2 className="text-lg font-bold">Dispositivos registrados</h2><p className="mt-1 text-xs text-[var(--app-muted)]">{matches.toLocaleString('es-BO')} resultados coinciden con tus filtros</p></div>
        {canExport && <a href={`/api/reports/inventory${exportParams.size ? `?${exportParams}` : ''}`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--app-hover)]"><Download size={18}/> Exportar Excel</a>}
      </div>
      <div className="px-4 py-3 sm:px-6"><InventoryFilters key={JSON.stringify(filters)} initial={filters}/></div>
      <div className="px-4 pb-4 sm:px-6"><InventoryTable devices={devices} canMove={canExport}/></div>
      <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] px-4 py-4 text-sm sm:px-6"><span className="text-[var(--app-muted)]">Página {page} de {totalPages} · {matches} dispositivos</span><div className="flex gap-2">
        {page > 1 ? <Link className="app-icon-button !w-auto gap-1 px-3" href={inventoryUrl(filters,page-1)}><ChevronLeft size={16}/> Anterior</Link> : <span className="app-icon-button !w-auto cursor-default gap-1 px-3 opacity-40"><ChevronLeft size={16}/>Anterior</span>}
        {page < totalPages ? <Link className="app-icon-button !w-auto gap-1 px-3" href={inventoryUrl(filters,page+1)}>Siguiente <ChevronRight size={16}/></Link> : <span className="app-icon-button !w-auto cursor-default gap-1 px-3 opacity-40">Siguiente <ChevronRight size={16}/></span>}
      </div></nav>
    </section>
  </main>;
}
