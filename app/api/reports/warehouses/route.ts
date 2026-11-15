import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { getCurrentUser, canRegisterDevice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Evitar que Excel interprete texto ingresado por usuarios como fórmula.
function excelSafe(value: string | null | undefined) {
  const text = value ?? '';
  return /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!canRegisterDevice(user.role)) return NextResponse.json({ error: 'Sin permisos para exportar', }, { status: 403 });
  try {
    const total = await prisma.location.count();
    if (total > 10000) return NextResponse.json({ error: 'Hay más de 10 000 almacenes; solicita un reporte paginado.' }, { status: 413 });
    const warehouses = await prisma.location.findMany({
      take: 10000,
      orderBy: { code: 'asc' },
      select: {
        code: true, name: true, description: true, address: true, isActive: true,
        _count: { select: { devices: true } },
      },
    });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'POS Control';
    const sheet = workbook.addWorksheet('Almacenes');
    sheet.columns = [
      { header: 'Código', key: 'code', width: 20 },
      { header: 'Almacén', key: 'name', width: 32 },
      { header: 'Estado', key: 'status', width: 18 },
      { header: 'POS actuales', key: 'devices', width: 19 },
      { header: 'Dirección', key: 'address', width: 45 },
      { header: 'Descripción', key: 'description', width: 55 },
    ];
    for (const row of warehouses) {
      sheet.addRow({ code: excelSafe(row.code), name: excelSafe(row.name),
        status: row.isActive ? 'Activo' : 'Inactivo', devices: row._count.devices,
        address: excelSafe(row.address), description: excelSafe(row.description),
      });
    }
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE94C62' } };
    sheet.getRow(1).height = 27;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'F1' };
    sheet.getColumn('code').numFmt = '@';
    const bytes = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(bytes), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="almacenes-pos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    console.error('Error exportando almacenes:', error);
    return NextResponse.json({ error: 'No se pudo exportar el reporte' }, { status: 500 });
  }
}
