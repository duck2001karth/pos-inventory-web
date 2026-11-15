import { NextResponse } from 'next/server';
import { getCurrentUser, canRegisterDevice, isSameOrigin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getWarehouses } from '@/lib/services/warehouse-service';
import { warehouseCreateSchema } from '@/lib/validators/warehouse';

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const prismaCode = (error: unknown, code: string) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado', 401);
  try {
    const warehouses = await getWarehouses();
    return NextResponse.json({ warehouses }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error listando almacenes:', error);
    return fail('No se pudieron consultar los almacenes', 500);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail('Origen no autorizado', 403);
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado', 401);
  if (!canRegisterDevice(user.role)) return fail('No tienes permisos para crear almacenes', 403);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('JSON inválido', 400); }
  const parsed = warehouseCreateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 400);
  const input = parsed.data;
  try {
    const warehouse = await prisma.$transaction(async (tx) => {
      const created = await tx.location.create({
        data: {
          code: input.code, name: input.name,
          description: input.description || null,
          address: input.address || null,
        },
        select: { id: true, code: true, name: true, isActive: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'CREATE', entityType: 'Location', entityId: created.id, actorId: user.id,
          details: { code: created.code, name: created.name, address: input.address || null },
        },
      });
      return created;
    });
    return NextResponse.json({ success: true, warehouse }, { status: 201 });
  } catch (error) {
    if (prismaCode(error, 'P2002')) return fail('Ya existe un almacén con ese código', 409);
    console.error('Error creando almacén:', error);
    return fail('No se pudo crear el almacén', 500);
  }
}
