'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';

import type { ReportFilters } from '@/lib/services/report-service';


type LocationOption = {
  id: string;
  code: string;
  name: string;
};

type ModelOption = {
  id: string;
  brand: string;
  model: string;
};

type Props = {
  initial: ReportFilters;
  locations: LocationOption[];
  models: ModelOption[];
};

const statuses = [
  ['IN_STOCK', 'En almacén'], ['ASSIGNED', 'Asignado'], ['IN_TRANSIT', 'En tránsito'],
  ['IN_REPAIR', 'En reparación'], ['RETIRED', 'Retirado'], ['LOST', 'Extraviado'],
];
const movementTypes = [
  ['RECEIPT', 'Ingreso'], ['TRANSFER', 'Transferencia'], ['DISPATCH', 'Salida'],
  ['ASSIGNMENT', 'Asignación'], ['RETURN', 'Devolución'],
  ['STATUS_CHANGE', 'Cambio de estado'], ['ADJUSTMENT', 'Ajuste'],
];

export default function ReportsFilters({ initial, locations, models }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<ReportFilters>(initial);
  function set<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) return;
    const params = new URLSearchParams();
    Object.entries(draft).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    router.push(`/reportes${params.size ? `?${params.toString()}` : ''}`);
  }
  return (
    <form onSubmit={submit} className="app-panel space-y-4 p-4 sm:p-5 print:hidden">
      <div className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={19} className="text-[var(--app-accent)]" />Filtros del reporte</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="space-y-1.5 text-xs font-medium">Desde (fecha de ingreso / movimiento)
          <input type="date" value={draft.from} onChange={e => set('from', e.target.value)} className="app-field block w-full text-sm" />
        </label>
        <label className="space-y-1.5 text-xs font-medium">Hasta
          <input type="date" value={draft.to} onChange={e => set('to', e.target.value)} className="app-field block w-full text-sm" />
        </label>
        <label className="space-y-1.5 text-xs font-medium">Almacén
          <select value={draft.locationId} onChange={e => set('locationId', e.target.value)} className="app-field block w-full text-sm">
            <option value="">Todos los almacenes</option>
            {locations.map(x => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium">Modelo SUNMI
          <select value={draft.modelId} onChange={e => set('modelId', e.target.value)} className="app-field block w-full text-sm">
            <option value="">Todos los modelos</option>
            {models.map(x => <option key={x.id} value={x.id}>{x.brand} {x.model}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium">Estado actual
          <select value={draft.status} onChange={e => set('status', e.target.value as ReportFilters['status'])} className="app-field block w-full text-sm">
            <option value="">Todos los estados</option>
            {statuses.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium">Observaciones
          <select value={draft.observations} onChange={e => set('observations', e.target.value as ReportFilters['observations'])} className="app-field block w-full text-sm">
            <option value="all">Todas</option><option value="with">Con observaciones</option><option value="without">Sin observaciones</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium">Tipo de movimiento
          <select value={draft.movementType} onChange={e => set('movementType', e.target.value as ReportFilters['movementType'])} className="app-field block w-full text-sm">
            <option value="">Todos los tipos</option>
            {movementTypes.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium">Buscar por código, S/N o IMEI
          <input value={draft.q} maxLength={100} onChange={e => set('q', e.target.value)} placeholder="Ej. 861899..." className="app-field block w-full text-sm" />
        </label>
      </div>
      {draft.from && draft.to && draft.from > draft.to && <p role="alert" className="text-sm text-red-600">La fecha inicial debe ser anterior o igual a la final.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={Boolean(draft.from && draft.to && draft.from > draft.to)} className="app-primary disabled:opacity-50">Aplicar filtros</button>
        <button type="button" onClick={() => { setDraft({ from: '', to: '', locationId: '', modelId: '', status: '', observations: 'all', movementType: '', q: '' }); router.push('/reportes'); }} className="app-icon-button !w-auto gap-2 px-4 text-sm"><RotateCcw size={16} />Limpiar</button>
      </div>
      <p className="text-xs text-[var(--app-muted)]">Las fechas filtran el ingreso de los POS y, por separado, la fecha de los movimientos. El almacén de los movimientos se interpreta como origen o destino.</p>
    </form>
  );
}
