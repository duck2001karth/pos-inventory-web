
import 'server-only';

import type { Prisma } from '@/app/generated/prisma/client';

export const INVENTORY_PAGE_SIZE = 10;

export function inventoryWhere(
  search: string,
): Prisma.DeviceWhereInput {
  const term = search.trim().slice(0, 100);

  if (!term) return {};

  return {
    OR: [
      {
        internalCode: {
          contains: term,
          mode: 'insensitive',
        },
      },
      {
        serialNumber: {
          contains: term,
          mode: 'insensitive',
        },
      },
      { imei: { contains: term } },
      { imei2: { contains: term } },
      {
        model: {
          is: {
            OR: [
              {
                brand: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
              {
                model: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      },
    ],
  };
}

export const inventorySelect = {
  id: true,
  internalCode: true,
  serialNumber: true,
  imei: true,
  imei2: true,
  status: true,
  notes: true,
  createdAt: true,
  model: {
    select: {
      brand: true,
      model: true,
    },
  },
  currentLocation: {
    select: {
      code: true,
      name: true,
    },
  },
} satisfies Prisma.DeviceSelect;
