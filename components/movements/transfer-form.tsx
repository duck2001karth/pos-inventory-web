'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeftRight, LoaderCircle } from 'lucide-react';
type Location = { id: string; name: string; code: string };
type Device = { id: string; internalCode: string; serialNumber: string | null; status: string; currentLocationId: string; currentLocation: { name: string } } | null;
export default function TransferForm({ locations, initialDevice }: { locations: Location[]; initialDevice: Device }) {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState(initialDevice?.id ?? '');
  const [destination, setDestination] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); if (loading) return; setError(''); setLoading(true);
    try {
      const response = await fetch('/api/movimientos', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, toLocationId: destination, reference, notes }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'No se pudo registrar la transferencia');
      router.replace('/movimientos'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error de conexión'); }
    finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="app-panel space-y-5 p-4 sm:p-6">
    {!initialDevice && <div role="alert" className="rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900">Abre el inventario y pulsa «Ver ficha» → «Transferir» para seleccionar un equipo válido.<Link className="ml-1 font-semibold underline" href="/inventario">Ir al inventario</Link></div>}
    <div className="space-y-2"><label htmlFor="device-id" className="text-sm font-semibold">Dispositivo</label><input id="device-id" readOnly value={initialDevice ? `${initialDevice.internalCode}${initialDevice.serialNumber ? ` · ${initialDevice.serialNumber}` : ''}` : ''} className="app-field w-full bg-[var(--app-hover)]"/><input type="hidden" value={deviceId} readOnly /></div>
    {initialDevice && <div className="rounded-xl bg-[var(--app-hover)] p-4 text-sm"><p><strong>Estado:</strong> {initialDevice.status}</p><p className="mt-1"><strong>Ubicación actual:</strong> {initialDevice.currentLocation.name}</p></div>}
    <div className="space-y-2"><label htmlFor="transfer-location" className="text-sm font-semibold">Almacén de destino *</label><select id="transfer-location" required value={destination} onChange={e=>setDestination(e.target.value)} className="app-field w-full"><option value="">Selecciona almacén</option>{locations.filter(x=>x.id!==initialDevice?.currentLocationId).map(x=><option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}</select>{locations.length < 2 && <p className="text-xs text-[var(--app-muted)]">Necesitas al menos otro almacén activo para transferir un dispositivo.</p>}</div>
    <div className="space-y-2"><label htmlFor="reference" className="text-sm font-semibold">Referencia (opcional)</label><input id="reference" maxLength={100} value={reference} onChange={e=>setReference(e.target.value)} className="app-field w-full" placeholder="Ej. TR-2026-001"/></div>
    <div className="space-y-2"><label htmlFor="notes" className="text-sm font-semibold">Observaciones</label><textarea id="notes" rows={4} maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} className="app-field w-full" placeholder="Motivo de la transferencia..."/></div>
    {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={17}/>{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={loading || !initialDevice || !destination || initialDevice.status!=='IN_STOCK'} type="submit" className="app-primary disabled:cursor-not-allowed disabled:opacity-50">{loading ? <LoaderCircle className="animate-spin" size={17}/> : <ArrowLeftRight size={17}/>}Confirmar transferencia</button><Link href="/movimientos" className="rounded-xl border border-[var(--app-border)] px-4 py-3 text-sm font-semibold">Cancelar</Link></div>
  </form>;
}
