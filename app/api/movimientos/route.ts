import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, isSameOrigin, canRegisterDevice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const transferSchema = z.object({
  deviceId: z.string().min(1).max(100),
  toLocationId: z.string().min(1).max(100),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail('Origen no autorizado', 403);
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado', 401);
  if (!canRegisterDevice(user.role)) return fail('No tienes permisos para transferir equipos', 403);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('JSON inválido', 400); }
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 400);
  const { deviceId, toLocationId, reference, notes } = parsed.data;
  try {
    const result = await prisma.$transaction(async tx => {
      const device = await tx.device.findUnique({ where: { id: deviceId }, select: { id: true, status: true, currentLocationId: true, internalCode: true } });
      if (!device) return { status: 'not_found' as const };
      if (device.status !== 'IN_STOCK') return { status: 'invalid_status' as const };
      if (device.currentLocationId === toLocationId) return { status: 'same_location' as const };
      const destination = await tx.location.findFirst({ where: { id: toLocationId, isActive: true }, select: { id: true, code: true } });
      if (!destination) return { status: 'invalid_location' as const };
      // Cambio condicional: si otro proceso movió el equipo, abortamos sin crear registros.
      const updated = await tx.device.updateMany({
        where: { id: deviceId, currentLocationId: device.currentLocationId, status: 'IN_STOCK' },
        data: { currentLocationId: destination.id },
      });
      if (updated.count !== 1) return { status: 'conflict' as const };
      const movement = await tx.inventoryMovement.create({ data: {
        type: 'TRANSFER', deviceId,
        fromLocationId: device.currentLocationId, toLocationId: destination.id,
        previousStatus: 'IN_STOCK', newStatus: 'IN_STOCK',
        actorId: user.id, reference: reference || null, notes: notes || null,
      }, select: { id: true, createdAt: true } });
      await tx.auditLog.create({ data: {
        action: 'INVENTORY_MOVEMENT', entityType: 'Device', entityId: deviceId, actorId: user.id,
        details: { movementId: movement.id, type: 'TRANSFER', fromLocationId: device.currentLocationId, toLocationId, reference: reference || null },
      } });
      return { status: 'ok' as const, movement, internalCode: device.internalCode };
    }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });
    switch (result.status) {
      case 'not_found': return fail('Dispositivo no encontrado', 404);
      case 'invalid_status': return fail('Solo se pueden transferir equipos en almacén', 409);
      case 'same_location': return fail('Selecciona un almacén diferente al actual', 400);
      case 'invalid_location': return fail('Almacén de destino no disponible', 400);
      case 'conflict': return fail('La ubicación del equipo cambió durante el proceso. Actualiza e inténtalo nuevamente.', 409);
      case 'ok': return NextResponse.json({ success: true, movement: result.movement, internalCode: result.internalCode }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creando transferencia:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') return fail('Conflicto de inventario. Vuelve a intentar.', 409);
    return fail('No se pudo completar la transferencia', 500);
  }
}
