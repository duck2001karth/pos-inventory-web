'use client';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import type { BatchItem } from './batch-types';
import { validateBatchItem } from './batch-validation';

export default function OcrBatchReview({item, disabled, onUpdate, onReviewed}: {
  item: BatchItem | undefined;
  disabled: boolean;
  onUpdate: (field: 'model'|'serialNumber'|'imei'|'imei2'|'notes', value:string)=>void;
  onReviewed: (checked:boolean)=>void;
}) {
  if (!item) return <div className="app-panel p-6 text-sm text-[var(--app-muted)]">Selecciona una foto para revisar los datos.</div>;
  const locked = disabled || item.status==='saved';
  const inputClass = 'app-field w-full font-mono text-sm';
  const invalid = validateBatchItem(item);
  return <section className="app-panel min-w-0 space-y-4 p-4 sm:p-5">
    <div><h2 className="text-lg font-bold">Revisión de {item.name}</h2><p className="break-words text-sm text-[var(--app-muted)]">{item.message || 'Comprueba cada identificador con la etiqueta.'}</p></div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold">Fotografía original</p>
        <div className="max-h-[52dvh] overflow-auto rounded-xl bg-black p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.preview} alt={`Etiqueta ${item.name}`} className="mx-auto h-auto max-h-[50dvh] max-w-full object-contain" />
        </div>
        <p className="text-xs text-[var(--app-muted)]">Acerca la fotografía para comprobar todos los dígitos.</p>
      </div>
      <div className="min-w-0 space-y-3">
        <label className="block space-y-1 text-sm font-semibold">Modelo *
          <select className={inputClass} disabled={locked} value={item.data.model} onChange={e => onUpdate('model',e.target.value)}>
            <option value="">Selecciona el modelo</option><option value="V2s / T5940">V2s / T5940</option><option value="V2 PRO / T5921">V2 PRO / T5921</option>
          </select>
        </label>
        {([{key:'serialNumber',label:'Número de serie *',numeric:false},{key:'imei',label:'IMEI 1 *',numeric:true},{key:'imei2',label:'IMEI 2 (obligatorio en V2s)',numeric:true}] as const).map(f => <label key={f.key} className="block space-y-1 text-sm font-semibold">{f.label}
          <input className={inputClass} disabled={locked} inputMode={f.numeric?'numeric':'text'} value={item.data[f.key]} maxLength={f.numeric?15:100} onChange={e => onUpdate(f.key, f.numeric?e.target.value.replace(/\D/g,'').slice(0,15):e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,100))}/>
        </label>)}
        <label className="block space-y-1 text-sm font-semibold">Observaciones
          <textarea className="app-field min-h-20 w-full resize-y font-normal" maxLength={1000} disabled={locked} value={item.notes} onChange={e => onUpdate('notes',e.target.value)}/>
        </label>
        {invalid && <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{invalid}</p>}
        {!invalid && item.status==='ready' && <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={18}/>Sin duplicados detectados en esta comprobación.</p>}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--app-border)] p-3 text-sm">
          <input type="checkbox" className="mt-1" checked={item.reviewed} disabled={locked || Boolean(invalid) || item.status==='pending'||item.status==='processing'} onChange={e=>onReviewed(e.target.checked)}/>
          <span className="flex-1"><span className="flex items-center gap-1 font-semibold"><ShieldCheck size={16}/>Confirmación del administrador</span>He contrastado los identificadores con la fotografía.</span>
        </label>
        {item.status==='saved' && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">Registrado: {item.internalCode}</p>}
      </div>
    </div>
  </section>;
}
