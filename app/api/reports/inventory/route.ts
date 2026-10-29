
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  inventorySelect,
  inventoryWhere,
} from '@/lib/services/inventory-query';

const MAX_EXPORT_ROWS = 5000;

const statusNames: Record<string, string> = {
  IN_STOCK: 'En almacén',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En tránsito',
  IN_REPAIR: 'En reparación',
  RETIRED: 'Retirado',
  LOST: 'Extraviado',
};

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión' },
      { status: 401 },
    );
  }

  if (
    user.role !== 'ADMIN' &&
    user.role !== 'INVENTORY_MANAGER'
  ) {
    return NextResponse.json(
      { error: 'No tienes permiso para exportar' },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get('q') ?? '')
    .trim()
    .slice(0, 100);

  const where = inventoryWhere(search);

  const total = await prisma.device.count({ where });

  if (total > MAX_EXPORT_ROWS) {
    return NextResponse.json(
      {
        error:
          `El reporte supera ${MAX_EXPORT_ROWS} registros. ` +
          'Utiliza una búsqueda para reducirlo.',
      },
      { status: 413 },
    );
  }

  const devices = await prisma.device.findMany({
    where,
    select: inventorySelect,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: MAX_EXPORT_ROWS,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'POS Control';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Inventario POS');

  sheet.columns = [
    { header: 'Código interno', key: 'internalCode', width: 45 },
    { header: 'Marca', key: 'brand', width: 18 },
    { header: 'Modelo', key: 'model', width: 24 },
    { header: 'S/N', key: 'serialNumber', width: 24 },
    { header: 'IMEI 1', key: 'imei1', width: 22 },
    { header: 'IMEI 2', key: 'imei2', width: 22 },
    { header: 'Estado', key: 'status', width: 20 },
    { header: 'Almacén', key: 'location', width: 26 },
    { header: 'Fecha de registro', key: 'createdAt', width: 22 },
  ];

  sheet.getRow(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };

  sheet.getRow(1).height = 26;

  for (const device of devices) {
    sheet.addRow({
      internalCode: device.internalCode,
      brand: device.model.brand,
      model: device.model.model,
      serialNumber: device.serialNumber ?? '',
      imei1: device.imei ?? '',
      imei2: device.imei2 ?? '',
      status:
        statusNames[device.status] ?? device.status,
      location: device.currentLocation.name,
      createdAt: device.createdAt,
    });
  }

  // Mantener los identificadores como texto.
  // Excel no debe convertir los IMEI en números.
  for (const columnKey of [
    'internalCode',
    'serialNumber',
    'imei1',
    'imei2',
  ]) {
    const column = sheet.getColumn(columnKey);
    column.numFmt = '@';
  }

  sheet.getColumn('createdAt').numFmt = 'dd/mm/yyyy hh:mm';

  sheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ];

  sheet.autoFilter = {
    from: 'A1',
    to: 'I1',
  };

  const buffer = await workbook.xlsx.writeBuffer();

  const date = new Date().toISOString().slice(0, 10);
  const filename = `inventario-pos-${date}.xlsx`;

  return new NextResponse(
    new Uint8Array(buffer),
    {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
