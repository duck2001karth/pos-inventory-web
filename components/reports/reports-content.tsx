import { BarChart3, ClipboardList, FileSpreadsheet, Package, Warehouse, Wrench, ArrowLeftRight, StickyNote } from 'lucide-react';

import { requireUser, canRegisterDevice } from '@/lib/auth';
import {
  getReportOptions, getReportOverview, parseReportFilters,
  type ReportFilters,
} from '@/lib/services/report-service';
import ReportsFilters from './reports-filters';
import ReportDownloads from './report-downloads';

const number = (value: number) => value.toLocaleString('es-BO');
const movementLabels: Record<string, string> = {
  RECEIPT: 'Ingresos', TRANSFER: 'Transferencias', DISPATCH: 'Salidas',
  ASSIGNMENT: 'Asignaciones', RETURN: 'Devoluciones',
  STATUS_CHANGE: 'Cambios de estado', ADJUSTMENT: 'Ajustes',
};

function CountCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Package }) {
  return <div className="app-panel flex min-w-0 items-center justify-between gap-2 p-4 sm:p-5">
    <div className="min-w-0"><p className="text-xs text-[var(--app-muted)] sm:text-sm">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{number(value)}</p></div>
    <span className="rounded-xl bg-[var(--app-accent-soft)] p-2.5 text-[var(--app-accent)]"><Icon size={22} /></span>
  </div>;
}

function Distribution({ title, items, total }: { title: string; items: { name: string; count: number }[]; total: number }) {
  return <section className="app-panel min-w-0 p-4 sm:p-6">
    <h2 className="font-bold">{title}</h2>
    {items.length === 0 ? <p className="mt-4 text-sm text-[var(--app-muted)]">No hay registros con los filtros seleccionados.</p> :
      <div className="mt-5 space-y-4">
        {items.map(item => {
          const percent = total ? item.count / total * 100 : 0;
          return <div key={item.name}>
            <div className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{item.name}</span><strong className="shrink-0 tabular-nums">{number(item.count)} <span className="font-normal text-[var(--app-muted)]">({percent.toFixed(1)}%)</span></strong></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-hover)]"><div className="h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${percent}%` }}/></div>
          </div>;
        })}
      </div>}
  </section>;
}

export default async function ReportsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const filters: ReportFilters = parseReportFilters(await searchParams);
  const options = await getReportOptions();
  const invalidDates = Boolean(filters.from && filters.to && filters.from > filters.to);
  const overview = invalidDates ? null : await getReportOverview(filters);
  return <main className="reports-print-page w-full min-w-0 space-y-5 px-3 py-5 sm:px-5 lg:px-7 lg:py-7 print:p-0">
    <header className="flex flex-wrap items-center justify-between gap-4 print:mb-5">
      <div><p className="text-xs font-bold uppercase tracking-[.17em] text-[var(--app-accent)]">Análisis y exportaciones</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Centro de reportes</h1><p className="mt-1 text-sm text-[var(--app-muted)]">Datos reales de inventario y trazabilidad de dispositivos POS.</p></div>
      <div className="hidden items-center gap-2 rounded-xl bg-[var(--app-accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--app-accent)] sm:flex print:hidden"><BarChart3 size={20}/> Reportes POS</div>
    </header>
    <ReportsFilters initial={filters} locations={options.locations} models={options.models}/>
    {invalidDates ? <div role="alert" className="app-panel p-5 text-sm text-red-600">La fecha inicial no puede superar la fecha final. Corrige los filtros para continuar.</div> : overview && <>
      <section aria-label="Indicadores del reporte" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <CountCard label="Dispositivos" value={overview.total} icon={Package} />
        <CountCard label="En almacén" value={overview.inStock} icon={Warehouse} />
        <CountCard label="Asignados" value={overview.assigned} icon={ClipboardList} />
        <CountCard label="En reparación" value={overview.inRepair} icon={Wrench} />
        <CountCard label="Con observaciones" value={overview.withObservations} icon={StickyNote} />
        <CountCard label="Sin observaciones" value={overview.withoutObservations} icon={FileSpreadsheet} />
        <CountCard label="Movimientos" value={overview.movements} icon={ArrowLeftRight} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Distribution title="Existencias por modelo" items={overview.byModel} total={overview.total}/>
        <Distribution title="Existencias por almacén" items={overview.byLocation} total={overview.total}/>
      </section>
      <section className="app-panel p-4 sm:p-6">
        <h2 className="font-bold">Movimientos por tipo</h2><p className="mt-1 text-xs text-[var(--app-muted)]">El almacén seleccionado se aplica al origen o destino del movimiento.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {overview.byMovement.length ? overview.byMovement.map(x => <div key={x.type} className="rounded-xl border border-[var(--app-border)] p-3"><p className="text-xs text-[var(--app-muted)]">{movementLabels[x.type] ?? x.type}</p><p className="mt-1 text-xl font-bold tabular-nums">{number(x.count)}</p></div>) : <p className="text-sm text-[var(--app-muted)]">Sin movimientos en el periodo.</p>}
        </div>
      </section>
      <ReportDownloads filters={filters} canExport={canRegisterDevice(user.role)} />
      <footer className="hidden text-xs text-[var(--app-muted)] print:block">POS Control — Reporte generado desde datos actuales. Fechas de ingreso y movimientos se filtran por separado. No constituye una fotografía histórica del inventario.</footer>
    </>}
  </main>;
}
