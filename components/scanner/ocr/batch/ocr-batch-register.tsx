'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Images, LoaderCircle, PackagePlus, ShieldAlert, Sparkles } from 'lucide-react';
import { recognizeSunmiLabel } from '@/components/scanner/ocr/recognize-label';
import type { SunmiLabelData } from '@/lib/utils/parse-sunmi-label';
import type { BatchItem } from './batch-types';
import { emptyData, getFingerprint } from './batch-types';
import { findLocalCollision, normalizeSunmiModel, validateBatchItem, verifyInDatabase } from './batch-validation';
import OcrBatchUploader from './ocr-batch-uploader';
import OcrBatchQueue from './ocr-batch-queue';
import OcrBatchReview from './ocr-batch-review';

const MAX_FILES = 12;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 72 * 1024 * 1024;

function normalizeData(input: SunmiLabelData): SunmiLabelData {
  return {
    ...input, brand: 'SUNMI', model: normalizeSunmiModel(input.model || ''),
    serialNumber: (input.serialNumber || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0,100),
    imei: (input.imei || '').replace(/\D/g, '').slice(0,15),
    imei2: (input.imei2 || '').replace(/\D/g, '').slice(0,15),
  };
}

export default function OcrBatchRegister() {
  const router = useRouter();
  const itemsRef = useRef<BatchItem[]>([]);
  const activeRef = useRef(false);
  const mounted = useRef(true);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [processed, setProcessed] = useState(0);

  const sync = useCallback((next: BatchItem[]) => {
    itemsRef.current = next;
    if (mounted.current) setItems(next);
  }, []);
  const patch = useCallback((id: string, change: Partial<BatchItem>) => {
    sync(itemsRef.current.map(item => item.id === id ? { ...item, ...change } : item));
  }, [sync]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      itemsRef.current.forEach(item => URL.revokeObjectURL(item.preview));
    };
  }, []);

  function addFiles(files: File[]) {
    if (activeRef.current) return;
    setError('');
    const existing = itemsRef.current;
    const allowed = Math.max(0, MAX_FILES - existing.length);
    const accepted: BatchItem[] = [];
    let total = existing.reduce((sum, item) => sum + item.file.size, 0);
    let refused = 0;
    for (const file of files) {
      if (accepted.length >= allowed || !file.type.startsWith('image/') || file.size > MAX_FILE_BYTES || total + file.size > MAX_TOTAL_BYTES) {
        refused++; continue;
      }
      total += file.size;
      accepted.push({
        id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), name: file.name,
        data: emptyData(), notes:'', reviewed:false, status:'pending', message:'Esperando reconocimiento.', fingerprint:'',
      });
    }
    if (accepted.length) {
      sync([...existing, ...accepted]);
      setSelectedId(current => current || accepted[0].id);
    }
    if (refused) setError(`Se omitieron ${refused} fotos. Límite: ${MAX_FILES} fotos, 12 MB por foto y 72 MB en total.`);
  }

  function removeItem(id: string) {
    if (activeRef.current) return;
    const item = itemsRef.current.find(x=>x.id===id);
    if (!item || item.status==='saved') return;
    URL.revokeObjectURL(item.preview);
    const remainder = itemsRef.current.filter(x=>x.id!==id);
    sync(remainder);
    if (selectedId===id) setSelectedId(remainder[0]?.id ?? '');
  }

  // Always use the current ref, never stale React state after await.
  async function checkItem(id: string) {
    const item = itemsRef.current.find(x=>x.id===id);
    if (!item || item.status==='saved') return;
    const fingerprint = getFingerprint(item);
    const invalid = validateBatchItem(item);
    if (invalid) { patch(id,{status:'invalid', message:invalid, fingerprint:'', reviewed:false}); return; }
    const collision = findLocalCollision(item,itemsRef.current);
    if (collision) { patch(id,{status:'duplicate',message:collision,fingerprint,reviewed:false}); return; }
    patch(id,{status:'checking', message:'Comprobando duplicados en Supabase...', fingerprint:''});
    try {
      const result = await verifyInDatabase(item);
      const current = itemsRef.current.find(x=>x.id===id);
      if (!current || getFingerprint(current)!==fingerprint || current.status==='saved') return;
      patch(id, {status:result.duplicate?'duplicate':'ready', fingerprint, message:result.message, reviewed:result.duplicate?false:current.reviewed});
    } catch (cause) {
      const current = itemsRef.current.find(x=>x.id===id);
      if (!current || getFingerprint(current)!==fingerprint) return;
      patch(id, {status:'error',fingerprint:'',message:cause instanceof Error?cause.message:'Falló la comprobación.',reviewed:false});
    }
  }

  async function processAll() {
    if (activeRef.current) return;
    activeRef.current = true; setBusy(true); setError(''); setProcessed(0);
    const ids = itemsRef.current.filter(item => item.status==='pending'||item.status==='error'||item.status==='invalid').map(x=>x.id);
    try {
      for (let index=0;index<ids.length;index++) {
        const id=ids[index];
        const item=itemsRef.current.find(x=>x.id===id);
        if (!item) continue;
        setSelectedId(id);
        patch(id,{status:'processing',message:'Reconociendo texto de la etiqueta...', reviewed:false});
        try {
          const result = await recognizeSunmiLabel(item.file, (percent, message) => {
            if (mounted.current) setPhase(`${index+1}/${ids.length} · ${message} (${percent}%)`);
          });
          const normalized = normalizeData(result.data);
          patch(id,{data:normalized, status:'review', message:result.passes>2?'Lectura adicional aplicada. Revisa los campos.':'Lectura completada. Revisa los campos.', fingerprint:''});
          await checkItem(id);
        } catch(cause) {
          patch(id,{status:'error',message:cause instanceof Error?cause.message:'No se pudo leer la foto.', reviewed:false});
        }
        setProcessed(index+1);
      }
    } finally {
      activeRef.current=false; setBusy(false); setPhase('');
    }
  }

  function edit(field: 'model'|'serialNumber'|'imei'|'imei2'|'notes', value: string) {
    if (activeRef.current) return;
    const item=itemsRef.current.find(x=>x.id===selectedId);
    if (!item || item.status==='saved') return;
    if(field==='notes') {
      patch(item.id,{notes:value.slice(0,1000),reviewed:false}); // No reiniciar la verificación por observaciones.
    } else {
      patch(item.id,{data:{...item.data,[field]:value},reviewed:false, status:'review',fingerprint:'',message:'Datos modificados. Se comprobarán nuevamente.'});
    }
  }

  const selected=items.find(item=>item.id===selectedId);
  const selectedFingerprint=selected?getFingerprint(selected):'';
  useEffect(() => {
    if (!selected || busy || activeRef.current || selected.status!=='review') return;
    if (validateBatchItem(selected)) return;
    const timer = setTimeout(() => { void checkItem(selected.id); }, 650);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedFingerprint, selected?.status, busy]);

  async function saveAll() {
    if (activeRef.current) return;
    const targets = itemsRef.current.filter(x=>x.status==='ready'&&x.reviewed&&x.fingerprint===getFingerprint(x));
    if (!targets.length) return;
    activeRef.current=true;setBusy(true);setError('');setProcessed(0);
    let saved=0;
    try {
      for (let index=0;index<targets.length;index++) {
        const id=targets[index].id;
        const item=itemsRef.current.find(x=>x.id===id);
        if (!item || item.status!=='ready' || !item.reviewed) continue;
        setSelectedId(id);
        setPhase(`Registrando POS ${index+1} de ${targets.length}...`);
        const collision = findLocalCollision(item,itemsRef.current);
        if (collision) { patch(id,{status:'duplicate',message:collision,reviewed:false}); continue; }
        patch(id,{status:'saving',message:'Registrando en Supabase...'});
        try {
          // Re-check immediately before write; the server also checks inside a DB transaction.
          const verification=await verifyInDatabase(item);
          if(verification.duplicate) {patch(id,{status:'duplicate',message:verification.message,reviewed:false});continue;}
          const response=await fetch('/api/devices',{
            method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({brand:'SUNMI',model:item.data.model,serialNumber:item.data.serialNumber,imei:item.data.imei,imei2:item.data.imei2,notes:item.notes.trim()}),
          });
          const result: {error?:string; device?:{internalCode?:string}}=await response.json();
          if(!response.ok) {
            patch(id,{status:response.status===409?'duplicate':'error',message:result.error||`Error HTTP ${response.status}`,reviewed:false});
            continue;
          }
          if(!result.device?.internalCode) throw new Error('Registro sin confirmación. Consulta el inventario antes de reintentar.');
          patch(id,{status:'saved',internalCode:result.device.internalCode,message:'Registrado correctamente.'});
          saved++;
        } catch(cause) {
          patch(id,{status:'error',message:`${cause instanceof Error?cause.message:'Error de conexión'}. Comprueba el inventario antes de reintentar.`,reviewed:false});
        } finally {setProcessed(index+1);}
      }
      if(saved) router.refresh();
    } finally {activeRef.current=false;setBusy(false);setPhase('');}
  }

  const stats={
    total:items.length,
    saved:items.filter(x=>x.status==='saved').length,
    ready:items.filter(x=>x.status==='ready'&&x.reviewed&&x.fingerprint===getFingerprint(x)).length,
    attention:items.filter(x=>['error','duplicate','invalid'].includes(x.status)).length,
  };
  const pending = items.some(x=>['pending','processing','checking','saving'].includes(x.status));
  const readyToSave = stats.ready>0 && !busy && !pending;
  return <main className="min-h-screen w-full space-y-5 bg-[var(--app-bg)] px-3 py-5 text-[var(--app-fg)] sm:px-6 lg:px-8">
    <Link href="/inventario/registrar" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-accent)]"><ArrowLeft size={17}/>Volver a registro individual</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[var(--app-accent)]">Centro de operaciones · OCR</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Registro de POS por lotes</h1><p className="mt-2 max-w-2xl text-sm text-[var(--app-muted)]">Una fotografía por dispositivo. El OCR procesa secuencialmente y ningún POS se registra sin tu confirmación.</p></div>
      <div className="rounded-2xl bg-[var(--app-accent-soft)] p-3 text-[var(--app-accent)]"><Images size={28}/></div>
    </header>
    <section className="app-panel space-y-4 p-4 sm:p-5">
      <div className="flex items-center gap-2 font-semibold"><Sparkles size={19} className="text-[var(--app-accent)]"/>Añadir fotografías</div>
      <OcrBatchUploader disabled={busy || items.length>=MAX_FILES} onFiles={addFiles}/>
      <p className="text-xs text-[var(--app-muted)]">Máximo 12 imágenes por lote. Se procesan en el navegador, una por una. Si tomas fotografías sucesivas, usa «Tomar otra foto».</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
        ['Fotos',stats.total],['Confirmadas',stats.ready],['Registradas',stats.saved],['Atención',stats.attention],
      ].map(([label,value])=><div key={label} className="rounded-xl bg-[var(--app-hover)] p-3"><p className="text-xs text-[var(--app-muted)]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>
      {phase && <p role="status" className="flex items-center gap-2 text-sm text-[var(--app-accent)]"><LoaderCircle className="animate-spin" size={17}/>{phase} {processed>0?`· ${processed} finalizadas`:''}</p>}
      {error && <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !items.some(x=>['pending','error','invalid'].includes(x.status))} onClick={()=>void processAll()} className="app-primary disabled:opacity-40"><Images size={18}/>Analizar fotos pendientes</button>
        <button type="button" disabled={!readyToSave} onClick={()=>void saveAll()} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--app-accent)] px-4 text-sm font-semibold text-[var(--app-accent)] disabled:opacity-40"><PackagePlus size={18}/>Registrar confirmadas ({stats.ready})</button>
      </div>
      <p className="flex items-start gap-2 text-xs text-[var(--app-muted)]"><ShieldAlert size={15} className="shrink-0"/>Revisa cada imagen, sus IMEI y observaciones antes de confirmar. Si alguna solicitud falla, consulta el inventario antes de repetir.</p>
    </section>
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(260px,0.32fr)_minmax(0,1fr)]">
      <OcrBatchQueue items={items} selectedId={selectedId} disabled={busy} onSelect={setSelectedId} onRemove={removeItem}/>
      <OcrBatchReview item={selected} disabled={busy} onUpdate={edit} onReviewed={checked => { const item=itemsRef.current.find(x=>x.id===selectedId); if(item)patch(item.id,{reviewed:checked}); }}/>
    </div>
    {stats.saved>0 && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700"><CheckCircle2 size={18}/>{stats.saved} dispositivos registrados. Puedes consultar los códigos en la cola.</div>}
    <div className="text-sm text-[var(--app-muted)]"><ClipboardCheck className="mr-2 inline-block" size={17}/>Las fotografías están solo en memoria de esta pestaña; al recargar se perderá el lote no guardado.</div>
  </main>;
}
