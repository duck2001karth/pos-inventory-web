import { NextResponse } from 'next/server';
import { getCurrentUser, canRegisterDevice, isSameOrigin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { warehouseUpdateSchema } from '@/lib/validators/warehouse';

type RouteContext = { params: Promise<{ id: string }> };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const prismaCode = (error: unknown, code: string) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code;

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) return fail('Origen no autorizado', 403);
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado', 401);
  if (!canRegisterDevice(user.role)) return fail('No tienes permisos para editar almacenes', 403);
  const { id } = await context.params;
  if (!id || id.length > 100) return fail('Identificador inválido', 400);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('JSON inválido', 400); }
  const parsed = warehouseUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 400);
  const data = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.location.findUnique({
        where: { id }, select: { code: true, isActive: true, name: true },
      });
      if (!existing) return { kind: 'missing' as const };
      if (!data.isActive && existing.code === 'ALM-001') return { kind: 'primary' as const };
      if (existing.isActive && !data.isActive) {
        const devices = await tx.device.count({ where: { currentLocationId: id } });
        if (devices > 0) return { kind: 'occupied' as const };
      }
      const changed = await tx.location.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description || null,
          address: data.address || null,
          isActive: data.isActive,
        },
        select: { id: true, code: true, name: true, isActive: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'UPDATE', entityType: 'Location', entityId: id, actorId: user.id,
          details: { oldName: existing.name, newName: changed.name, wasActive: existing.isActive, isActive: changed.isActive },
        },
      });
      return { kind: 'ok' as const, warehouse: changed };
    }, { isolationLevel: 'Serializable', timeout: 10000 });
    if (result.kind === 'missing') return fail('Almacén no encontrado', 404);
    if (result.kind === 'primary') return fail('El almacén principal ALM-001 no puede desactivarse', 409);
    if (result.kind === 'occupied') return fail('No se puede desactivar un almacén con dispositivos asignados a esa ubicación', 409);
    return NextResponse.json({ success: true, warehouse: result.warehouse });
  } catch (error) {
    if (prismaCode(error, 'P2034')) return fail('Conflicto de inventario. Actualiza e intenta nuevamente.', 409);
    console.error('Error editando almacén:', error);
    return fail('No se pudo actualizar el almacén', 500);
  }
}
