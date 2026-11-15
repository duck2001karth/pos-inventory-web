import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

import { getCurrentUser, canRegisterDevice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  assertReportDateRange, getReportOverview,
  parseReportFilters, reportDeviceWhere, reportMovementWhere,
} from '@/lib/services/report-service';
import { excelSafe, styleWorksheet, workbookResponse } from '@/lib/utils/excel-report';

const MAX_ROWS = 5000;
const MAX_MOVEMENTS = 10000;
const statuses: Record<string, string> = {
  IN_STOCK: 'En almacén', ASSIGNED: 'Asignado', IN_TRANSIT: 'En tránsito',
  IN_REPAIR: 'En reparación', RETIRED: 'Retirado', LOST: 'Extraviado',
};
const types: Record<string, string> = {
  RECEIPT: 'Ingreso', DISPATCH: 'Salida', TRANSFER: 'Transferencia',
  ASSIGNMENT: 'Asignación', RETURN: 'Devolución',
  STATUS_CHANGE: 'Cambio de estado', ADJUSTMENT: 'Ajuste',
};

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('Debes iniciar sesión.', 401);
  if (!canRegisterDevice(user.role)) return fail('No tienes permisos para exportar reportes.', 403);
  const url = new URL(request.url);
  const kind = url.searchParams.get('type');
  if (kind !== 'inventory' && kind !== 'movements' && kind !== 'summary') {
    return fail('Tipo de reporte inválido.', 400);
  }
  const filters = parseReportFilters(Object.fromEntries(url.searchParams.entries()));
  try {
    assertReportDateRange(filters);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'POS Control';
    wb.created = new Date();

    if (kind === 'inventory') {
      const where = reportDeviceWhere(filters);
      const count = await prisma.device.count({ where });
      if (count > MAX_ROWS) return fail(`Se encontraron ${count} dispositivos. Limita los filtros a ${MAX_ROWS} filas.`, 413);
      const items = await prisma.device.findMany({
        where, take: MAX_ROWS, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          internalCode: true, serialNumber: true, imei: true, imei2: true,
          notes: true, status: true, createdAt: true,
          model: { select: { brand: true, model: true } },
          currentLocation: { select: { code: true, name: true } },
        },
      });
      const sh = wb.addWorksheet('Inventario');
      sh.columns = [
        { header: 'Código interno', key: 'code', width: 46 },
        { header: 'Marca', key: 'brand', width: 18 },
        { header: 'Modelo', key: 'model', width: 28 },
        { header: 'S/N', key: 'serial', width: 28 },
        { header: 'IMEI 1', key: 'imei', width: 23 },
        { header: 'IMEI 2', key: 'imei2', width: 23 },
        { header: 'Estado', key: 'status', width: 20 },
        { header: 'Almacén', key: 'warehouse', width: 35 },
        { header: 'Observaciones', key: 'notes', width: 54 },
        { header: 'Fecha de ingreso', key: 'date', width: 25 },
      ];
      for (const d of items) sh.addRow({
        code: excelSafe(d.internalCode), brand: excelSafe(d.model.brand),
        model: excelSafe(d.model.model), serial: excelSafe(d.serialNumber),
        imei: excelSafe(d.imei), imei2: excelSafe(d.imei2),
        status: statuses[d.status] ?? d.status,
        warehouse: excelSafe(`${d.currentLocation.code} - ${d.currentLocation.name}`),
        notes: excelSafe(d.notes), date: d.createdAt,
      });
      for (const key of ['code', 'serial', 'imei', 'imei2']) sh.getColumn(key).numFmt = '@';
      sh.getColumn('date').numFmt = 'dd/mm/yyyy hh:mm';
      styleWorksheet(sh);
      return workbookResponse(wb, 'reporte-inventario-pos');
    }

    if (kind === 'movements') {
      const where = reportMovementWhere(filters);
      const count = await prisma.inventoryMovement.count({ where });
      if (count > MAX_MOVEMENTS) return fail(`Hay ${count} movimientos. Reduce el rango a ${MAX_MOVEMENTS} filas.`, 413);
      const items = await prisma.inventoryMovement.findMany({
        where, take: MAX_MOVEMENTS,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          type: true, createdAt: true, reference: true, notes: true,
          previousStatus: true, newStatus: true,
          device: { select: { internalCode: true, serialNumber: true } },
          actor: { select: { name: true } },
          fromLocation: { select: { code: true, name: true } },
          toLocation: { select: { code: true, name: true } },
        },
      });
      const sh = wb.addWorksheet('Movimientos');
      sh.columns = [
        { header: 'Fecha', key: 'date', width: 24 },
        { header: 'Tipo', key: 'type', width: 24 },
        { header: 'Código POS', key: 'code', width: 46 },
        { header: 'S/N', key: 'serial', width: 26 },
        { header: 'Origen', key: 'from', width: 34 },
        { header: 'Destino', key: 'to', width: 34 },
        { header: 'Estado anterior', key: 'before', width: 22 },
        { header: 'Estado nuevo', key: 'after', width: 22 },
        { header: 'Responsable', key: 'actor', width: 30 },
        { header: 'Referencia', key: 'reference', width: 25 },
        { header: 'Observaciones', key: 'notes', width: 55 },
      ];
      for (const m of items) sh.addRow({
        date: m.createdAt, type: types[m.type] ?? m.type,
        code: excelSafe(m.device.internalCode), serial: excelSafe(m.device.serialNumber),
        from: excelSafe(m.fromLocation ? `${m.fromLocation.code} - ${m.fromLocation.name}` : ''),
        to: excelSafe(m.toLocation ? `${m.toLocation.code} - ${m.toLocation.name}` : ''),
        before: m.previousStatus ? statuses[m.previousStatus] ?? m.previousStatus : '',
        after: m.newStatus ? statuses[m.newStatus] ?? m.newStatus : '',
        actor: excelSafe(m.actor.name), reference: excelSafe(m.reference), notes: excelSafe(m.notes),
      });
      sh.getColumn('date').numFmt = 'dd/mm/yyyy hh:mm';
      for (const key of ['code', 'serial', 'reference']) sh.getColumn(key).numFmt = '@';
      styleWorksheet(sh);
      return workbookResponse(wb, 'reporte-movimientos-pos');
    }

    // Executive summary: only aggregates, never invents figures.
    const overview = await getReportOverview(filters);
    const summary = wb.addWorksheet('Resumen');
    summary.columns = [{ header: 'Indicador', key: 'name', width: 40 }, { header: 'Cantidad', key: 'value', width: 22 }];
    for (const [name, value] of [
      ['Total de POS', overview.total], ['En almacén', overview.inStock],
      ['Asignados', overview.assigned], ['En reparación', overview.inRepair],
      ['Con observaciones', overview.withObservations],
      ['Sin observaciones', overview.withoutObservations],
      ['Movimientos (periodo seleccionado)', overview.movements],
    ] as [string, number][]) summary.addRow({ name, value });
    styleWorksheet(summary);

    const models = wb.addWorksheet('Por modelo');
    models.columns = [{ header: 'Modelo', key: 'name', width: 42 }, { header: 'Dispositivos', key: 'value', width: 22 }];
    overview.byModel.forEach(x => models.addRow({ name: excelSafe(x.name), value: x.count }));
    styleWorksheet(models);

    const locations = wb.addWorksheet('Por almacén');
    locations.columns = [{ header: 'Almacén', key: 'name', width: 48 }, { header: 'Dispositivos', key: 'value', width: 22 }];
    overview.byLocation.forEach(x => locations.addRow({ name: excelSafe(x.name), value: x.count }));
    styleWorksheet(locations);

    const moves = wb.addWorksheet('Por movimiento');
    moves.columns = [{ header: 'Tipo', key: 'name', width: 36 }, { header: 'Movimientos', key: 'value', width: 22 }];
    overview.byMovement.forEach(x => moves.addRow({ name: types[x.type] ?? x.type, value: x.count }));
    styleWorksheet(moves);

    return workbookResponse(wb, 'resumen-ejecutivo-pos');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('La fecha inicial')) return fail(error.message, 400);
    console.error('Error exportando reporte:', error);
    return fail('No se pudo generar el archivo Excel.', 500);
  }
}
