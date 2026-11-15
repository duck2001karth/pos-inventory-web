import 'server-only';
import type { Prisma, DeviceStatus } from '@/app/generated/prisma/client';

export const INVENTORY_PAGE_SIZE = 20;
export type ObservationsFilter = 'all' | 'with' | 'without';

export type InventoryFilters = {
  q: string;
  status: string;
  model: string;
  observations: ObservationsFilter;
};

const statuses: DeviceStatus[] = [
  'IN_STOCK', 'ASSIGNED', 'IN_TRANSIT', 'IN_REPAIR', 'RETIRED', 'LOST',
];

export function parseInventoryFilters(params: Record<string, string | string[] | undefined>): InventoryFilters {
  const value = (key: string) => {
    const raw = params[key];
    return (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
  };
  const observations = value('observations');
  return {
    q: value('q').slice(0, 100),
    status: statuses.includes(value('status') as DeviceStatus) ? value('status') : '',
    model: ['V2s / T5940', 'V2 PRO / T5921'].includes(value('model')) ? value('model') : '',
    observations: observations === 'with' || observations === 'without' ? observations : 'all',
  };
}

export function inventoryWhere(filters: InventoryFilters | string): Prisma.DeviceWhereInput {
  const f: InventoryFilters = typeof filters === 'string'
    ? { q: filters, status: '', model: '', observations: 'all' }
    : filters;
  const and: Prisma.DeviceWhereInput[] = [];
  const q = f.q.trim().slice(0, 100);
  if (q) and.push({ OR: [
    { internalCode: { contains: q, mode: 'insensitive' } },
    { serialNumber: { contains: q, mode: 'insensitive' } },
    { imei: { contains: q } },
    { imei2: { contains: q } },
    { model: { is: { OR: [
      { brand: { contains: q, mode: 'insensitive' } },
      { model: { contains: q, mode: 'insensitive' } },
    ] } } },
  ] });
  if (f.status) and.push({ status: f.status as DeviceStatus });
  if (f.model) and.push({ model: { is: { model: f.model } } });
  if (f.observations === 'with') {
    and.push({ notes: { not: null } }, { notes: { not: '' } });
  } else if (f.observations === 'without') {
    and.push({ OR: [{ notes: null }, { notes: '' }] });
  }
  return and.length ? { AND: and } : {};
}

export function inventoryUrl(filters: InventoryFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.model) params.set('model', filters.model);
  if (filters.observations !== 'all') params.set('observations', filters.observations);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/inventario${query ? `?${query}` : ''}`;
}

export const inventorySelect = {
  id: true, internalCode: true, serialNumber: true, imei: true, imei2: true,
  status: true, notes: true, createdAt: true,
  model: { select: { brand: true, model: true } },
  currentLocation: { select: { code: true, name: true } },
} satisfies Prisma.DeviceSelect;
