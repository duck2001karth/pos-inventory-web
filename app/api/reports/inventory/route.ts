import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { inventorySelect, inventoryWhere, parseInventoryFilters } from '@/lib/services/inventory-query';

const MAX_EXPORT_ROWS = 5000;
const statusNames: Record<string, string> = { IN_STOCK: 'En almacén', ASSIGNED: 'Asignado', IN_TRANSIT: 'En tránsito', IN_REPAIR: 'En reparación', RETIRED: 'Retirado', LOST: 'Extraviado' };
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'INVENTORY_MANAGER') return NextResponse.json({ error: 'Sin permisos para exportar' }, { status: 403 });
  const url = new URL(request.url);
  const filters = parseInventoryFilters(Object.fromEntries(url.searchParams.entries()));
  const where = inventoryWhere(filters);
  const total = await prisma.device.count({ where });
  if (total > MAX_EXPORT_ROWS) return NextResponse.json({ error: `El reporte supera ${MAX_EXPORT_ROWS} filas. Aplica filtros.` }, { status: 413 });
  const devices = await prisma.device.findMany({ where, select: inventorySelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: MAX_EXPORT_ROWS });
  const workbook = new ExcelJS.Workbook(); workbook.creator = 'POS Control';
  const sheet = workbook.addWorksheet('Inventario POS');
  sheet.columns = [
    { header: 'Código interno', key: 'code', width: 45 }, { header: 'Marca', key: 'brand', width: 16 },
    { header: 'Modelo', key: 'model', width: 24 }, { header: 'S/N', key: 'serial', width: 25 },
    { header: 'IMEI 1', key: 'imei', width: 22 }, { header: 'IMEI 2', key: 'imei2', width: 22 },
    { header: 'Estado', key: 'status', width: 20 }, { header: 'Ubicación', key: 'location', width: 27 },
    { header: 'Observaciones', key: 'notes', width: 55 }, { header: 'Registrado', key: 'date', width: 23 },
  ];
  const header = sheet.getRow(1); header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; header.height = 26;
  for (const d of devices) sheet.addRow({ code:d.internalCode, brand:d.model.brand, model:d.model.model, serial:d.serialNumber ?? '', imei:d.imei ?? '', imei2:d.imei2 ?? '', status:statusNames[d.status] ?? d.status, location:d.currentLocation.name, notes:d.notes ?? '', date:d.createdAt });
  for (const key of ['code','serial','imei','imei2']) sheet.getColumn(key).numFmt = '@';
  sheet.getColumn('date').numFmt = 'dd/mm/yyyy hh:mm'; sheet.views=[{ state:'frozen', ySplit:1 }]; sheet.autoFilter={ from:'A1', to:'J1' };
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition':`attachment; filename="inventario-pos-${new Date().toISOString().slice(0,10)}.xlsx"`, 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' } });
}
