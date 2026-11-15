import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      model: { select: { brand: true, model: true } },
      currentLocation: { select: { id: true, code: true, name: true } },
      movements: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20,
        include: {
          actor: { select: { name: true } },
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } },
        },
      },
    },
  });
  if (!device) return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 });
  return NextResponse.json({ device }, { headers: { 'Cache-Control': 'private, no-store' } });
}
