import Link from 'next/link';
import { ArrowLeftRight, Plus, Warehouse } from 'lucide-react';
import { requireUser, canRegisterDevice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
const labels: Record<string,string> = { RECEIPT: 'Ingreso', TRANSFER: 'Transferencia', DISPATCH: 'Salida', ASSIGNMENT: 'Asignación', RETURN: 'Devolución', STATUS_CHANGE: 'Cambio de estado', ADJUSTMENT: 'Ajuste' };
const formatDate = (date: Date) => new Intl.DateTimeFormat('es-BO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/La_Paz'}).format(date);
export default async function MovementsContent() {
  const user = await requireUser();
  const [total, transfers, recent] = await Promise.all([
    prisma.inventoryMovement.count(),
    prisma.inventoryMovement.count({ where: { type: 'TRANSFER' } }),
    prisma.inventoryMovement.findMany({ take: 50, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: {
      device: { select: { internalCode: true, serialNumber: true } }, actor: { select: { name: true } },
      fromLocation: { select: { name: true } }, toLocation: { select: { name: true } },
    } }),
  ]);
  return <main className="w-full space-y-5 px-3 py-5 sm:px-5 lg:px-7">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[var(--app-accent)]">Fase 3 · Trazabilidad</p><h1 className="mt-2 text-2xl font-bold">Movimientos de inventario</h1><p className="mt-1 text-sm text-[var(--app-muted)]">Consulta ingresos y transferencias de tus dispositivos.</p></div>{canRegisterDevice(user.role) && <Link href="/movimientos/nuevo" className="app-primary"><Plus size={18}/> Nueva transferencia</Link>}</header>
    <div className="grid gap-3 sm:grid-cols-2"><div className="app-panel p-5"><p className="text-sm text-[var(--app-muted)]">Movimientos registrados</p><p className="mt-2 text-3xl font-bold">{total}</p></div><div className="app-panel p-5"><p className="text-sm text-[var(--app-muted)]">Transferencias</p><p className="mt-2 text-3xl font-bold">{transfers}</p></div></div>
    <section className="app-panel overflow-hidden"><div className="flex items-center gap-2 border-b border-[var(--app-border)] p-4 sm:p-5"><ArrowLeftRight className="text-[var(--app-accent)]" size={21}/><h2 className="font-semibold">Últimos 50 movimientos</h2></div>
      {recent.length === 0 ? <p className="p-8 text-sm text-[var(--app-muted)]">Todavía no hay movimientos.</p> : <div className="divide-y divide-[var(--app-border)]">{recent.map(m => <article key={m.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5"><div className="min-w-0"><p className="font-semibold">{labels[m.type] ?? m.type}</p><p className="truncate font-mono text-xs text-[var(--app-muted)]" title={m.device.internalCode}>{m.device.internalCode}</p><p className="text-xs text-[var(--app-muted)]">{m.device.serialNumber ?? 'Sin S/N'}</p></div><div className="flex items-start gap-2 text-[var(--app-muted)]"><Warehouse size={16}/><p>{m.fromLocation?.name ?? 'Origen inicial'} → {m.toLocation?.name ?? 'Sin destino'}<span className="block text-xs">Usuario: {m.actor.name}</span></p></div><time dateTime={m.createdAt.toISOString()} className="text-xs text-[var(--app-muted)]">{formatDate(m.createdAt)}</time></article>)}</div>}
    </section>
  </main>;
}
