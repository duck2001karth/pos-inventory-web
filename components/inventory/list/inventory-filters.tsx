'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCcw } from 'lucide-react';

type Filters = { q: string; status: string; model: string; observations: 'all' | 'with' | 'without' };
export default function InventoryFilters({ initial }: { initial: Filters }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  function update<K extends keyof Filters>(key: K, next: Filters[K]) {
    setValue(previous => ({ ...previous, [key]: next }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (value.q.trim()) params.set('q', value.q.trim());
    if (value.model) params.set('model', value.model);
    if (value.status) params.set('status', value.status);
    if (value.observations !== 'all') params.set('observations', value.observations);
    router.push(`/inventario${params.size ? `?${params}` : ''}`);
  }
  return <form onSubmit={submit} role="search" className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_170px_190px_auto]">
    <label className="relative"><span className="sr-only">Buscar POS</span><Search size={18} className="absolute left-3 top-3 text-slate-400"/><input value={value.q} maxLength={100} onChange={e => update('q', e.target.value)} placeholder="S/N, IMEI, código o modelo" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm"/></label>
    <select aria-label="Modelo" value={value.model} onChange={e => update('model', e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Todos los modelos</option><option value="V2s / T5940">SUNMI V2s</option><option value="V2 PRO / T5921">SUNMI V2 PRO</option></select>
    <select aria-label="Estado" value={value.status} onChange={e => update('status', e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Todos los estados</option><option value="IN_STOCK">En almacén</option><option value="ASSIGNED">Asignado</option><option value="IN_TRANSIT">En tránsito</option><option value="IN_REPAIR">En reparación</option><option value="RETIRED">Retirado</option><option value="LOST">Extraviado</option></select>
    <select aria-label="Observaciones" value={value.observations} onChange={e => update('observations', e.target.value as Filters['observations'])} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">Todas las observaciones</option><option value="with">Con observaciones</option><option value="without">Sin observaciones</option></select>
    <div className="flex gap-2"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Search size={17}/>Filtrar</button><button type="button" aria-label="Limpiar filtros" title="Limpiar filtros" onClick={() => { setValue({q:'',model:'',status:'',observations:'all'}); router.push('/inventario'); }} className="rounded-xl border border-slate-300 px-3"><RotateCcw size={17}/></button></div>
  </form>;
}
