import 'server-only';

import type { Prisma, DeviceStatus, MovementType } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';

const statuses: DeviceStatus[] = ['IN_STOCK', 'ASSIGNED', 'IN_TRANSIT', 'IN_REPAIR', 'RETIRED', 'LOST'];
const movementTypes: MovementType[] = ['RECEIPT', 'DISPATCH', 'TRANSFER', 'ASSIGNMENT', 'RETURN', 'STATUS_CHANGE', 'ADJUSTMENT'];

export type ReportFilters = {
  from: string;
  to: string;
  locationId: string;
  modelId: string;
  status: DeviceStatus | '';
  observations: 'all' | 'with' | 'without';
  movementType: MovementType | '';
  q: string;
};

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function parseReportFilters(params: Record<string, string | string[] | undefined>): ReportFilters {
  const read = (key: string) => {
    const raw = params[key];
    return (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
  };
  const from = read('from');
  const to = read('to');
  const observations = read('observations');
  return {
    from: validDate(from) ? from : '',
    to: validDate(to) ? to : '',
    locationId: read('locationId').slice(0, 100),
    modelId: read('modelId').slice(0, 100),
    status: statuses.includes(read('status') as DeviceStatus) ? read('status') as DeviceStatus : '',
    observations: observations === 'with' || observations === 'without' ? observations : 'all',
    movementType: movementTypes.includes(read('movementType') as MovementType) ? read('movementType') as MovementType : '',
    q: read('q').slice(0, 100),
  };
}

// Bolivia uses UTC-04 year-round. Exclusive end avoids 23:59:59.999 edge cases.
function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00-04:00`);
}
function nextDay(value: string): Date {
  return new Date(startOfDay(value).getTime() + 86_400_000);
}

export function reportDateRange(filters: ReportFilters): { gte?: Date; lt?: Date } {
  return {
    ...(filters.from ? { gte: startOfDay(filters.from) } : {}),
    ...(filters.to ? { lt: nextDay(filters.to) } : {}),
  };
}

export function assertReportDateRange(filters: ReportFilters): void {
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new Error('La fecha inicial no puede superar la fecha final.');
  }
}

export function reportDeviceWhere(filters: ReportFilters): Prisma.DeviceWhereInput {
  const and: Prisma.DeviceWhereInput[] = [];
  if (filters.q) {
    and.push({ OR: [
      { internalCode: { contains: filters.q, mode: 'insensitive' } },
      { serialNumber: { contains: filters.q, mode: 'insensitive' } },
      { imei: { contains: filters.q } },
      { imei2: { contains: filters.q } },
    ] });
  }
  if (filters.locationId) and.push({ currentLocationId: filters.locationId });
  if (filters.modelId) and.push({ modelId: filters.modelId });
  if (filters.status) and.push({ status: filters.status });
  if (filters.observations === 'with') and.push({ notes: { not: null } }, { notes: { not: '' } });
  if (filters.observations === 'without') and.push({ OR: [{ notes: null }, { notes: '' }] });
  const range = reportDateRange(filters);
  if (Object.keys(range).length) and.push({ createdAt: range });
  return and.length ? { AND: and } : {};
}

export function reportMovementWhere(filters: ReportFilters): Prisma.InventoryMovementWhereInput {
  const and: Prisma.InventoryMovementWhereInput[] = [];
  const range = reportDateRange(filters);
  if (Object.keys(range).length) and.push({ createdAt: range });
  if (filters.movementType) and.push({ type: filters.movementType });
  if (filters.locationId) and.push({ OR: [
    { fromLocationId: filters.locationId }, { toLocationId: filters.locationId },
  ] });
  if (filters.modelId || filters.status || filters.observations !== 'all' || filters.q) {
    // For movements the device-related filters reflect the CURRENT device record.
    // Location is handled above against movement origin/destination instead.
    const deviceFilters = { ...filters, locationId: '', from: '', to: '' };
    and.push({ device: { is: reportDeviceWhere(deviceFilters) } });
  }
  return and.length ? { AND: and } : {};
}

export async function getReportOptions() {
  const [locations, models] = await Promise.all([
    prisma.location.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.deviceModel.findMany({ orderBy: [{ brand: 'asc' }, { model: 'asc' }], select: { id: true, brand: true, model: true } }),
  ]);
  return { locations, models };
}

export async function getReportOverview(filters: ReportFilters) {
  assertReportDateRange(filters);
  const where = reportDeviceWhere(filters);
  const movementWhere = reportMovementWhere(filters);
  const [total, inStock, assigned, inRepair, withObservations, movements, byModel, byLocation, byMovement] = await Promise.all([
    prisma.device.count({ where }),
    prisma.device.count({ where: { AND: [where, { status: 'IN_STOCK' }] } }),
    prisma.device.count({ where: { AND: [where, { status: 'ASSIGNED' }] } }),
    prisma.device.count({ where: { AND: [where, { status: 'IN_REPAIR' }] } }),
    prisma.device.count({ where: { AND: [where, { notes: { not: null } }, { notes: { not: '' } }] } }),
    prisma.inventoryMovement.count({ where: movementWhere }),
    prisma.device.groupBy({ by: ['modelId'], where, _count: { _all: true }, orderBy: { modelId: 'asc' } }),
    prisma.device.groupBy({ by: ['currentLocationId'], where, _count: { _all: true }, orderBy: { currentLocationId: 'asc' } }),
    prisma.inventoryMovement.groupBy({ by: ['type'], where: movementWhere, _count: { _all: true }, orderBy: { type: 'asc' } }),
  ]);
  const [models, locations] = await Promise.all([
    prisma.deviceModel.findMany({ where: { id: { in: byModel.map(x => x.modelId) } }, select: { id: true, brand: true, model: true } }),
    prisma.location.findMany({ where: { id: { in: byLocation.map(x => x.currentLocationId) } }, select: { id: true, code: true, name: true } }),
  ]);
  const modelNames = new Map(models.map(x => [x.id, `${x.brand} ${x.model}`]));
  const locationNames = new Map(locations.map(x => [x.id, `${x.code} · ${x.name}`]));
  return {
    total, inStock, assigned, inRepair, withObservations, withoutObservations: total - withObservations, movements,
    byModel: byModel.map(x => ({ name: modelNames.get(x.modelId) ?? 'Modelo desconocido', count: x._count._all })).sort((a,b)=>b.count-a.count),
    byLocation: byLocation.map(x => ({ name: locationNames.get(x.currentLocationId) ?? 'Almacén desconocido', count: x._count._all })).sort((a,b)=>b.count-a.count),
    byMovement: byMovement.map(x => ({ type: x.type, count: x._count._all })).sort((a,b)=>b.count-a.count),
  };
}

export function reportParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== 'all') params.set(key, value);
  }
  return params;
}
