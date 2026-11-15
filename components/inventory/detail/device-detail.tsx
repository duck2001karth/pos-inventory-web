import Link from 'next/link';
import { ArrowLeft, History, Package } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StatusBadge from '@/components/ui/status-badge';

const movementLabels: Record<string, string> = {
  RECEIPT: 'Ingreso al almacén', DISPATCH: 'Salida', TRANSFER: 'Transferencia',
  ASSIGNMENT: 'Asignación', RETURN: 'Devolución', STATUS_CHANGE: 'Cambio de estado', ADJUSTMENT: 'Ajuste',
};
const formatDate = (value: Date) => new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(value);
export default async function DeviceDetail({ id }: { id: string }) {
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      model: { select: { brand: true, model: true } },
      currentLocation: { select: { code: true, name: true } },
      movements: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50,
        include: { actor: { select: { name: true } }, fromLocation: { select: { name: true } }, toLocation: { select: { name: true } } } },
    },
  });
  if (!device) notFound();
  const fields = [
    ['Código interno', device.internalCode], ['Marca', device.model.brand], ['Modelo', device.model.model],
    ['S/N', device.serialNumber ?? '—'], ['IMEI 1', device.imei ?? '—'], ['IMEI 2', device.imei2 ?? 'No aplica'],
    ['Ubicación', `${device.currentLocation.name} (${device.currentLocation.code})`], ['Registrado', formatDate(device.createdAt)],
    ['Observaciones', device.notes?.trim() || 'Sin observaciones'],
  ];
  return <main className="mx-auto max-w-5xl space-y-6 p-4 pb-12 text-slate-900 md:p-8">
    <Link href="/inventario" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={17}/>Volver al inventario</Link>
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-white p-5"><div className="flex items-start gap-3"><Package className="mt-1 text-blue-600" size={24}/><div><p className="text-sm text-slate-500">Ficha del dispositivo</p><h1 className="mt-1 break-all font-mono text-lg font-bold md:text-2xl">{device.internalCode}</h1><p className="mt-2 text-sm">{device.model.brand} {device.model.model}</p></div></div><StatusBadge status={device.status}/></header>
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Identificación y ubicación</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl></section>
    <section className="rounded-2xl border bg-white p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><History size={20}/>Historial de movimientos</h2><p className="mt-1 text-xs text-slate-500">Se muestran los 50 movimientos más recientes del dispositivo.</p>
    {device.movements.length === 0 ? <p className="mt-5 text-sm text-slate-500">Todavía no se registraron movimientos.</p> : <ol className="mt-5 space-y-3">{device.movements.map(m => <li key={m.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{movementLabels[m.type] ?? m.type}</strong><time className="text-xs text-slate-500" dateTime={m.createdAt.toISOString()}>{formatDate(m.createdAt)}</time></div><p className="mt-1 text-sm text-slate-600">{m.fromLocation?.name ?? 'Origen inicial'} → {m.toLocation?.name ?? 'Sin destino'}</p><p className="mt-1 text-xs text-slate-500">Responsable: {m.actor.name}</p>{m.notes && <p className="mt-2 text-sm">{m.notes}</p>}</li>)}</ol>}
    </section>
  </main>;
}
