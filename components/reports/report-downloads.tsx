'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Printer, LoaderCircle } from 'lucide-react';

import type { ReportFilters } from '@/lib/services/report-service';

type Kind = 'inventory' | 'movements' | 'summary';
const names: Record<Kind, string> = {
  inventory: 'Inventario detallado',
  movements: 'Historial de movimientos',
  summary: 'Resumen ejecutivo',
};

export default function ReportDownloads({ filters, canExport }: { filters: ReportFilters; canExport: boolean }) {
  const [working, setWorking] = useState<Kind | null>(null);
  const [error, setError] = useState('');

  async function download(kind: Kind) {
    if (working) return;
    setWorking(kind);
    setError('');
    try {
      const params = new URLSearchParams({ type: kind });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.set(key, value);
      });
      const response = await fetch(`/api/reports/export?${params}`, {
        credentials: 'same-origin', cache: 'no-store',
      });
      if (!response.ok) {
        const json: unknown = await response.json().catch(() => null);
        const message = json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
          ? json.error : 'No se pudo generar el reporte.';
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `pos-control-${kind}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        // Releasing the object URL after the click is queued avoids a stale URL.
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de descarga.');
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className="app-panel space-y-4 p-4 sm:p-5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-lg font-bold">Exportar reportes</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Todos los archivos usan los filtros aplicados arriba.</p></div>
        <button type="button" onClick={() => window.print()} className="app-icon-button !w-auto gap-2 px-3 text-sm"><Printer size={17}/> Imprimir / Guardar PDF</button>
      </div>
      {canExport ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(names) as Kind[]).map(kind => (
            <button type="button" key={kind} disabled={working !== null} onClick={() => void download(kind)}
              className="flex min-h-24 items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-4 text-left transition hover:border-[var(--app-accent)] disabled:opacity-50">
              <span className="flex items-center gap-3"><FileSpreadsheet className="shrink-0 text-emerald-600" size={24}/><span className="text-sm font-semibold">{names[kind]}<span className="mt-1 block text-xs font-normal text-[var(--app-muted)]">Archivo Excel (.xlsx)</span></span></span>
              {working === kind ? <LoaderCircle className="shrink-0 animate-spin" size={18}/> : <Download className="shrink-0 text-[var(--app-accent)]" size={18}/>}
            </button>
          ))}
        </div>
      ) : <p className="rounded-xl bg-[var(--app-bg)] p-4 text-sm text-[var(--app-muted)]">Puedes consultar las estadísticas; las exportaciones Excel requieren el rol de Administrador o Responsable de Inventario.</p>}
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
