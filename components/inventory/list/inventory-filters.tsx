'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCcw } from 'lucide-react';

type Filters = { q: string; status: string; model: string; observations: 'all' | 'with' | 'without' };
export default function InventoryFilters({ initial }: { initial: Filters }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  function update<K extends keyof Filters>(key: K, next: Filters[K]) { setValue(previous => ({ ...previous, [key]: next })); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (value.q.trim()) params.set('q', value.q.trim());
    if (value.model) params.set('model', value.model);
    if (value.status) params.set('status', value.status);
    if (value.observations !== 'all') params.set('observations', value.observations);
    router.push(`/inventario${params.size ? `?${params}` : ''}`);
  }
  function clear() { setValue({q:'',model:'',status:'',observations:'all'}); router.push('/inventario'); }
  return <form onSubmit={submit} role="search" className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(140px,175px)_minmax(140px,175px)_minmax(160px,195px)_auto]">
    <label className="relative min-w-0"><span className="sr-only">Buscar POS</span><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]"/><input value={value.q} maxLength={100} onChange={e => update('q', e.target.value)} placeholder="Buscar S/N, IMEI, código o modelo" className="app-field w-full pl-10 text-sm"/></label>
    <select aria-label="Modelo" value={value.model} onChange={e => update('model', e.target.value)} className="app-field w-full text-sm"><option value="">Todos los modelos</option><option value="V2s / T5940">SUNMI V2s</option><option value="V2 PRO / T5921">SUNMI V2 PRO</option></select>
    <select aria-label="Estado" value={value.status} onChange={e => update('status', e.target.value)} className="app-field w-full text-sm"><option value="">Todos los estados</option><option value="IN_STOCK">En almacén</option><option value="ASSIGNED">Asignado</option><option value="IN_TRANSIT">En tránsito</option><option value="IN_REPAIR">En reparación</option><option value="RETIRED">Retirado</option><option value="LOST">Extraviado</option></select>
    <select aria-label="Observaciones" value={value.observations} onChange={e => update('observations', e.target.value as Filters['observations'])} className="app-field w-full text-sm"><option value="all">Todas las observaciones</option><option value="with">Con observaciones</option><option value="without">Sin observaciones</option></select>
    <div className="flex gap-2 md:col-span-2 xl:col-span-1"><button type="submit" className="app-primary min-w-0 flex-1"><Search size={17}/> Filtrar</button><button type="button" aria-label="Limpiar filtros" title="Limpiar filtros" onClick={clear} className="app-icon-button !h-auto"><RotateCcw size={17}/></button></div>
  </form>;
}
