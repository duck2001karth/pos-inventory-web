import { Suspense } from 'react';
import Link from 'next/link';
import { requireUser, canRegisterDevice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TransferForm from '@/components/movements/transfer-form';
import PageLoading from '@/components/ui/page-loading';
type Props = { searchParams: Promise<{ deviceId?: string }> };
async function Content({ searchParams }: Props) {
  const user = await requireUser();
  if (!canRegisterDevice(user.role)) return <main className="p-8">No tienes permisos para registrar transferencias.</main>;
  const { deviceId } = await searchParams;
  const [locations, device] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }),
    deviceId && deviceId.length < 100 ? prisma.device.findUnique({ where: { id: deviceId }, select: { id: true, internalCode: true, serialNumber: true, status: true, currentLocationId: true, currentLocation: { select: { name: true } } } }) : Promise.resolve(null),
  ]);
  return <main className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 sm:px-5 lg:px-7"><Link href="/movimientos" className="text-sm text-[var(--app-accent)]">← Volver a movimientos</Link><div><h1 className="text-2xl font-bold">Nueva transferencia</h1><p className="mt-1 text-sm text-[var(--app-muted)]">Cada operación actualizará la ubicación y generará movimiento y auditoría.</p></div><TransferForm locations={locations} initialDevice={device}/></main>;
}
export default function NewMovementPage({ searchParams }: Props) { return <Suspense fallback={<PageLoading label="Preparando transferencia..." />}><Content searchParams={searchParams}/></Suspense>; }
