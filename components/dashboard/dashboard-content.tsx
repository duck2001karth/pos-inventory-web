import Link from 'next/link';
import {
  ArrowRight, Camera, CirclePlus, ClipboardList, Package,
  ScanLine, Smartphone, Warehouse, Wrench,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import StatCard from './stat-card';

const statusLabels: Record<string, string> = {
  IN_STOCK: 'En almacén', ASSIGNED: 'Asignado', IN_TRANSIT: 'En tránsito',
  IN_REPAIR: 'En reparación', RETIRED: 'Retirado', LOST: 'Extraviado',
};

function PercentBar({ value, total, color }: { value: number; total: number; color: string }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-hover)]" aria-label={`${percent}%`} role="img">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default async function DashboardContent() {
  const user = await requireUser();
  const [total, inStock, assigned, inRepair, withNotes, perModel, recent] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({ where: { status: 'IN_STOCK' } }),
    prisma.device.count({ where: { status: 'ASSIGNED' } }),
    prisma.device.count({ where: { status: 'IN_REPAIR' } }),
    prisma.device.count({ where: { notes: { not: null, notIn: [''] } } }),
    prisma.deviceModel.findMany({
      select: { id: true, brand: true, model: true, _count: { select: { devices: true } } },
      orderBy: { model: 'asc' },
    }),
    prisma.device.findMany({
      take: 5,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, internalCode: true, serialNumber: true, status: true,
        model: { select: { brand: true, model: true } },
        currentLocation: { select: { name: true } },
      },
    }),
  ]);

  const withoutNotes = total - withNotes;
  const groups = perModel.filter(item => item._count.devices > 0);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 md:px-8 md:py-9">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#142c61] via-[#1b4aa1] to-[#2563eb] p-6 text-white shadow-lg shadow-blue-900/10 md:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-200">Centro de operaciones</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Resumen de inventario</h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100">Bienvenido, {user.name}. Consulta existencias, modelos y registros recientes en un solo lugar.</p>
          </div>
          <Link href="/inventario/registrar" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50">
            <CirclePlus size={19} /> Registrar POS
          </Link>
        </div>
      </section>

      <section aria-label="Estadísticas principales" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard title="Total de POS" value={total} icon={Smartphone} description="Equipos registrados" color="blue" />
        <StatCard title="En almacén" value={inStock} icon={Warehouse} description="Disponibles" color="green" />
        <StatCard title="Asignados" value={assigned} icon={Package} description="Actualmente asignados" color="violet" />
        <StatCard title="En reparación" value={inRepair} icon={Wrench} description="Pendientes de atención" color="amber" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-semibold">Distribución por modelo</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Equipos SUNMI registrados por modelo</p></div>
            <Package size={21} className="text-blue-500" />
          </div>
          <div className="mt-5 space-y-5">
            {groups.length === 0 ? <p className="text-sm text-[var(--app-muted)]">Sin modelos registrados.</p> : groups.map((model, index) => {
              const count = model._count.devices;
              const pct = total ? (count / total) * 100 : 0;
              return (
                <div key={model.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{model.brand} {model.model}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{count} <span className="text-xs font-normal text-[var(--app-muted)]">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <PercentBar value={count} total={total} color={index % 2 === 0 ? 'bg-blue-500' : 'bg-cyan-500'} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-semibold">Calidad del registro</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Observaciones en el inventario</p></div>
            <ClipboardList size={21} className="text-amber-500" />
          </div>
          <div className="mt-6 space-y-5">
            <div><div className="flex justify-between text-sm"><span>Con observaciones</span><strong>{withNotes.toLocaleString('es-BO')}</strong></div><PercentBar value={withNotes} total={total} color="bg-amber-500" /></div>
            <div><div className="flex justify-between text-sm"><span>Sin observaciones</span><strong>{withoutNotes.toLocaleString('es-BO')}</strong></div><PercentBar value={withoutNotes} total={total} color="bg-emerald-500" /></div>
            <Link href="/inventario" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-500 hover:underline">Ver inventario <ArrowRight size={15}/></Link>
          </div>
          <p className="mt-4 text-xs text-[var(--app-muted)]">Los registros cuyo campo de observaciones contiene solo espacios deben normalizarse para obtener cifras exactas.</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] p-5">
            <div><h2 className="text-lg font-semibold">Dispositivos recientes</h2><p className="mt-1 text-xs text-[var(--app-muted)]">Últimos equipos registrados</p></div>
            <Link href="/inventario" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-500">Ver todos <ArrowRight size={16}/></Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--app-muted)]">Todavía no hay dispositivos registrados.</div>
          ) : (
            <div className="divide-y divide-[var(--app-border)]">
              {recent.map(device => (
                <div key={device.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-[var(--app-hover)] sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" title={device.internalCode}>{device.internalCode}</p>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">{device.model.brand} {device.model.model} · S/N {device.serialNumber ?? '—'}</p>
                  </div>
                  <div className="text-right"><span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-500">{statusLabels[device.status] ?? device.status}</span><p className="mt-2 text-xs text-[var(--app-muted)]">{device.currentLocation.name}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Acciones rápidas</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Tus herramientas más usadas</p>
          <div className="mt-5 space-y-3">
            {[
              { href: '/inventario/registrar', icon: Camera, title: 'Registrar por OCR', desc: 'Fotografía y validación de etiqueta' },
              { href: '/inventario/escaner', icon: ScanLine, title: 'Lector QR / Barras', desc: 'Identificar códigos' },
              { href: '/inventario', icon: Package, title: 'Explorar inventario', desc: 'Buscar y revisar equipos' },
            ].map(action => (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] p-3.5 transition hover:border-blue-400 hover:bg-[var(--app-hover)]">
                <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500"><action.icon size={20} /></span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{action.title}</span><span className="block text-xs text-[var(--app-muted)]">{action.desc}</span></span>
                <ArrowRight size={16} className="ml-auto shrink-0 text-[var(--app-muted)]" />
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[var(--app-hover)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Almacén principal</p><p className="mt-1 font-semibold">ALM-001</p></div>
        </div>
      </section>
    </main>
  );
}
