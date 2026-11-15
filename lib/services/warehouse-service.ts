import 'server-only';
import { prisma } from '@/lib/prisma';

export async function getWarehouses() {
  const locations = await prisma.location.findMany({
    orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    select: {
      id: true, code: true, name: true, description: true, address: true,
      isActive: true, createdAt: true, updatedAt: true,
      _count: { select: { devices: true } },
    },
  });
  return locations.map((location) => ({
    id: location.id,
    code: location.code,
    name: location.name,
    description: location.description ?? '',
    address: location.address ?? '',
    isActive: location.isActive,
    deviceCount: location._count.devices,
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  }));
}

export type WarehouseRow = Awaited<ReturnType<typeof getWarehouses>>[number];
