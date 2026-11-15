import Link from 'next/link';
import {
  ArrowRight, Camera, CirclePlus, ClipboardList, Package,
  ScanLine, Smartphone, Warehouse, Wrench,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import StatCard from './stat-card';

const statusLabels: Record<string, string> = {
  IN_STOCK: 'En almacén',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En tránsito',
  IN_REPAIR: 'En reparación',
  RETIRED: 'Retirado',
  LOST: 'Extraviado',
};

type ProgressBarProps = {
  value: number;
  total: number;
  tone?: 'accent' | 'green' | 'amber';
};

function ProgressBar({ value, total, tone = 'accent' }: ProgressBarProps) {
  const percent = total ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  const colors = {
    accent: 'bg-[var(--app-accent)]',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-hover)]" role="img" aria-label={`${percent.toFixed(1)}%`}>
      <div className={`h-full rounded-full transition-[width] ${colors[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default async function DashboardContent() {
  const user = await requireUser();

  const [total, inStock, assigned, inRepair, withNotes, models, recent] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({ where: { status: 'IN_STOCK' } }),
    prisma.device.count({ where: { status: 'ASSIGNED' } }),
    prisma.device.count({ where: { status: 'IN_REPAIR' } }),
    prisma.device.count({ where: { AND: [{ notes: { not: null } }, { notes: { not: '' } }] } }),
    prisma.deviceModel.findMany({
      select: {
        id: true, brand: true, model: true,
        _count: { select: { devices: true } },
      },
      orderBy: { model: 'asc' },
    }),
    prisma.device.findMany({
      take: 5,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        internalCode: true,
        serialNumber: true,
        status: true,
        model: { select: { brand: true, model: true } },
        currentLocation: { select: { name: true } },
      },
    }),
  ]);

  const withoutNotes = total - withNotes;
  const modelGroups = models.filter((item) => item._count.devices > 0);

  return (
    <main className="w-full min-w-0 space-y-5 px-3 py-5 sm:px-5 sm:py-6 lg:px-6 xl:px-8 2xl:px-10">
      {/* Encabezado ligero: no depende del color azul anterior. */}
      <section className="relative overflow-hidden rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-28 h-72 w-72 rounded-full bg-[var(--app-accent-soft)] opacity-70 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-accent)]">Centro de operaciones</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Resumen de inventario</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
              Bienvenido, {user.name}. Consulta existencias, modelos y dispositivos recientes desde un solo lugar.
            </p>
          </div>
          <Link href="/inventario/registrar" className="app-primary shrink-0">
            <CirclePlus size={19} /> Registrar POS
          </Link>
        </div>
      </section>

      {/* Tarjetas: una columna en móviles estrechos, dos en móviles anchos, cuatro en escritorio. */}
      <section aria-label="Estadísticas principales" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        <StatCard title="Total de POS" value={total} icon={Smartphone} description="Equipos registrados" color="blue" />
        <StatCard title="En almacén" value={inStock} icon={Warehouse} description="Disponibles para operación" color="green" />
        <StatCard title="Asignados" value={assigned} icon={Package} description="Actualmente asignados" color="violet" />
        <StatCard title="En reparación" value={inRepair} icon={Wrench} description="Pendientes de atención" color="amber" />
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-[1.2fr_0.8fr]">
        <article className="app-panel min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Distribución por modelo</h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Equipos SUNMI registrados por modelo</p>
            </div>
            <Package size={21} className="shrink-0 text-[var(--app-accent)]" />
          </div>
          <div className="mt-6 space-y-5">
            {modelGroups.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">Todavía no hay modelos registrados.</p>
            ) : modelGroups.map((item) => {
              const count = item._count.devices;
              const pct = total ? (count / total) * 100 : 0;
              return (
                <div key={item.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{item.brand} {item.model}</span>
                    <span className="font-semibold tabular-nums">{count.toLocaleString('es-BO')} <span className="font-normal text-[var(--app-muted)]">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <ProgressBar value={count} total={total} />
                </div>
              );
            })}
          </div>
        </article>

        <article className="app-panel min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Calidad del registro</h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Observaciones en el inventario</p>
            </div>
            <ClipboardList size={21} className="shrink-0 text-[var(--app-accent)]" />
          </div>
          <div className="mt-6 space-y-5">
            <div>
              <div className="flex justify-between gap-2 text-sm"><span>Con observaciones</span><strong className="tabular-nums">{withNotes.toLocaleString('es-BO')}</strong></div>
              <ProgressBar value={withNotes} total={total} tone="amber" />
            </div>
            <div>
              <div className="flex justify-between gap-2 text-sm"><span>Sin observaciones</span><strong className="tabular-nums">{withoutNotes.toLocaleString('es-BO')}</strong></div>
              <ProgressBar value={withoutNotes} total={total} tone="green" />
            </div>
            <Link href="/inventario" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-accent)] hover:underline">
              Ver inventario <ArrowRight size={16} />
            </Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--app-muted)]">
            Los registros con observaciones compuestas solo por espacios deben normalizarse para un conteo exacto.
          </p>
        </article>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <article className="app-panel min-w-0 overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold">Dispositivos recientes</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">Últimos equipos registrados</p>
            </div>
            <Link href="/inventario" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--app-accent)]">
              Ver todos <ArrowRight size={16} />
            </Link>
          </header>
          {recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--app-muted)]">Todavía no hay equipos registrados.</p>
          ) : (
            <div className="divide-y divide-[var(--app-border)]">
              {recent.map((device) => (
                <Link href={`/inventario/${encodeURIComponent(device.id)}`} key={device.id} className="flex min-w-0 flex-col gap-2 p-4 transition hover:bg-[var(--app-hover)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" title={device.internalCode}>{device.internalCode}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                      {device.model.brand} {device.model.model} · S/N {device.serialNumber ?? '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <span className="rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--app-accent)]">
                      {statusLabels[device.status] ?? device.status}
                    </span>
                    <span className="text-xs text-[var(--app-muted)]">{device.currentLocation.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <aside className="app-panel min-w-0 p-4 sm:p-5">
          <h2 className="text-lg font-bold">Acciones rápidas</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Tus herramientas más utilizadas</p>
          <div className="mt-5 space-y-3">
            {[
              { href: '/inventario/registrar', icon: Camera, title: 'Registrar por OCR', desc: 'Fotografía y validación SUNMI' },
              { href: '/inventario/escaner', icon: ScanLine, title: 'Lector QR / Barras', desc: 'Identificar códigos' },
              { href: '/inventario', icon: Package, title: 'Consultar inventario', desc: 'Buscar y revisar dispositivos' },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] p-3.5 transition hover:bg-[var(--app-hover)] hover:border-[var(--app-accent)]">
                <span className="rounded-xl bg-[var(--app-accent-soft)] p-2.5 text-[var(--app-accent)]"><action.icon size={20} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{action.title}</span><span className="block text-xs text-[var(--app-muted)]">{action.desc}</span></span>
                <ArrowRight size={16} className="shrink-0 text-[var(--app-muted)]" />
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[var(--app-hover)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">Almacén principal</p>
            <p className="mt-1 font-semibold">ALM-001</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
