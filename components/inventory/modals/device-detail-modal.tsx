'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftRight, Clock3, Copy, LoaderCircle, X } from 'lucide-react';
import type { InventoryDevice } from '@/types/inventory';
import StatusBadge from '@/components/ui/status-badge';
type Movement = { id: string; type: string; createdAt: string; notes: string | null; actor: { name: string }; fromLocation: { name: string } | null; toLocation: { name: string } | null };
type FullDevice = InventoryDevice & { movements: Movement[] };
const types: Record<string,string> = { RECEIPT: 'Ingreso', TRANSFER: 'Transferencia', DISPATCH: 'Salida', ASSIGNMENT: 'Asignación', RETURN: 'Devolución', STATUS_CHANGE: 'Cambio de estado', ADJUSTMENT: 'Ajuste' };
function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div className="min-w-0"><dt className="text-xs font-medium text-[var(--app-muted)]">{label}</dt><dd className="mt-1 break-all text-sm font-semibold">{value || '—'}</dd></div>;
}
export default function DeviceDetailModal({ device, canMove = false, onClose }: { device: InventoryDevice | null; canMove?: boolean; onClose: () => void }) {
  const [loaded, setLoaded] = useState<FullDevice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!device) { return; }
    const controller = new AbortController();
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    setLoaded(null); setError(''); setLoading(true);
    fetch(`/api/devices/${encodeURIComponent(device.id)}`, { cache: 'no-store', signal: controller.signal })
      .then(async r => { const result = await r.json(); if (!r.ok) throw new Error(result.error ?? 'No se pudo cargar la ficha'); return result.device as FullDevice; })
      .then(setLoaded).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Error al cargar'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    function keydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]');
      if (!items?.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length-1].focus(); }
      else if (!e.shiftKey && document.activeElement === items[items.length-1]) { e.preventDefault(); items[0].focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { controller.abort(); document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keydown); previousFocus?.focus(); };
  }, [device?.id, onClose]);
  if (!device) return null;
  const d = loaded ?? device;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-2 sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="device-dialog-title" className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-fg)] shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-4 sm:px-6">
        <div className="min-w-0"><h2 id="device-dialog-title" className="text-lg font-bold">Ficha del dispositivo</h2><p className="text-xs text-[var(--app-muted)]">{d.model.brand} · {d.model.model}</p></div>
        <div className="flex items-center gap-2"><StatusBadge status={d.status}/><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar ficha" className="app-icon-button"><X size={19}/></button></div>
      </header>
      <div className="min-h-0 space-y-5 overflow-y-auto p-4 sm:p-6">
        <div className="rounded-xl bg-[var(--app-hover)] p-4"><p className="text-xs text-[var(--app-muted)]">Código interno</p><div className="mt-1 flex items-center gap-2"><p className="min-w-0 flex-1 break-all font-mono text-sm font-bold">{d.internalCode}</p><button type="button" aria-label="Copiar código" title="Copiar código" className="app-icon-button shrink-0" onClick={() => void navigator.clipboard?.writeText(d.internalCode)}><Copy size={17}/></button></div></div>
        <dl className="grid gap-4 rounded-xl border border-[var(--app-border)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="S/N" value={d.serialNumber}/><Detail label="IMEI 1" value={d.imei}/><Detail label="IMEI 2" value={d.imei2}/>
          <Detail label="Ubicación" value={d.currentLocation.name}/><Detail label="Observaciones" value={d.notes}/>
          <Detail label="Registrado" value={new Intl.DateTimeFormat('es-BO',{dateStyle:'medium',timeZone:'America/La_Paz'}).format(new Date(d.createdAt))}/>
        </dl>
        <section><h3 className="flex items-center gap-2 text-base font-semibold"><Clock3 size={18}/> Movimientos recientes</h3>
          {loading && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[var(--app-muted)]"><LoaderCircle className="animate-spin" size={17}/>Cargando historial...</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          {loaded && (loaded.movements.length ? <ol className="mt-3 space-y-2">{loaded.movements.map(m => <li key={m.id} className="rounded-xl border border-[var(--app-border)] p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{types[m.type] ?? m.type}</strong><time className="text-xs text-[var(--app-muted)]">{new Intl.DateTimeFormat('es-BO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/La_Paz'}).format(new Date(m.createdAt))}</time></div><p className="mt-1 text-[var(--app-muted)]">{m.fromLocation?.name ?? 'Ingreso inicial'} → {m.toLocation?.name ?? '—'}</p><p className="mt-1 text-xs text-[var(--app-muted)]">Responsable: {m.actor.name}</p>{m.notes && <p className="mt-1">{m.notes}</p>}</li>)}</ol> : <p className="mt-3 text-sm text-[var(--app-muted)]">Sin movimientos registrados.</p>)}
        </section>
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--app-border)] p-4">
        {canMove && d.status === 'IN_STOCK' && <Link href={`/movimientos/nuevo?deviceId=${encodeURIComponent(d.id)}`} onClick={onClose} className="app-primary"><ArrowLeftRight size={17}/> Transferir</Link>}
        <button type="button" onClick={onClose} className="rounded-xl border border-[var(--app-border)] px-4 py-2.5 text-sm font-semibold">Cerrar</button>
      </footer>
    </section>
  </div>;
}
