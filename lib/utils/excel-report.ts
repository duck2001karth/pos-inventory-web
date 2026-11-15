import 'server-only';

import ExcelJS from 'exceljs';

export function excelSafe(value: string | null | undefined): string {
  const text = value ?? '';
  // Avoid spreadsheet formula injection on user-controlled values.
  return /^[\s\u0000-\u001f]*[=+@\-]/.test(text) ? `'${text}` : text;
}

export function styleWorksheet(sheet: ExcelJS.Worksheet): void {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE94C62' } };
  header.alignment = { vertical: 'middle' };
  header.height = 28;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  if (sheet.columnCount > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  }
  for (let i = 2; i <= sheet.rowCount; i++) {
    if (i % 2 === 0) sheet.getRow(i).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FC' },
    };
  }
}

export async function workbookResponse(workbook: ExcelJS.Workbook, name: string): Promise<Response> {
  const bytes = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
