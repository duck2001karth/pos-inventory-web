'use client';
import { CheckCircle2, AlertTriangle, Clock3, LoaderCircle, Trash2 } from 'lucide-react';
import type { BatchItem, BatchStatus } from './batch-types';

const states: Record<BatchStatus, string> = {
  pending:'Pendiente', processing:'Leyendo...', review:'Revisión', checking:'Comprobando...',
  ready:'Lista para registrar', duplicate:'Duplicada', invalid:'Datos incompletos',
  error:'Error', saving:'Guardando...', saved:'Registrada',
};
export default function OcrBatchQueue({items, selectedId, disabled, onSelect, onRemove}: {
  items: BatchItem[]; selectedId: string; disabled: boolean;
  onSelect: (id:string)=>void; onRemove: (id:string)=>void;
}) {
  return <section className="app-panel min-w-0 p-3 sm:p-4">
    <h2 className="mb-3 text-base font-bold">Cola de fotografías ({items.length})</h2>
    <div className="max-h-[70dvh] space-y-2 overflow-y-auto">
      {items.map((item, i) => <div key={item.id} className={`flex items-center gap-2 rounded-xl border p-2 ${selectedId===item.id?'border-[var(--app-accent)] bg-[var(--app-accent-soft)]':'border-[var(--app-border)]'}`}>
        <button type="button" onClick={() => onSelect(item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.preview} alt="" className="h-14 w-12 shrink-0 rounded-lg bg-black object-contain" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{i+1}. {item.name}</span>
            <span className="flex items-center gap-1 text-xs text-[var(--app-muted)]">
              {item.status==='saved'?<CheckCircle2 size={13}/>:item.status==='error'||item.status==='duplicate'||item.status==='invalid'?<AlertTriangle size={13}/>:item.status==='processing'||item.status==='checking'||item.status==='saving'?<LoaderCircle className="animate-spin" size={13}/>:<Clock3 size={13}/>} {states[item.status]}
            </span>
          </span>
        </button>
        {item.status!=='saved' && <button type="button" disabled={disabled} onClick={() => onRemove(item.id)} aria-label={`Quitar ${item.name}`} className="rounded-lg p-2 text-[var(--app-muted)] hover:text-red-600 disabled:opacity-40"><Trash2 size={17}/></button>}
      </div>)}
      {!items.length && <p className="p-3 text-sm text-[var(--app-muted)]">Añade fotografías para comenzar.</p>}
    </div>
  </section>;
}
