'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftRight, Check, Download, Edit3, MapPin, Plus, Search,
  ShieldCheck, Warehouse, X,
} from 'lucide-react';
import AlertDialog from '@/components/ui/alert-dialog';
import type { WarehouseRow } from '@/lib/services/warehouse-service';

type Props = { initialWarehouses: WarehouseRow[]; canManage: boolean };
type WarehouseForm = {
  code: string; name: string; description: string; address: string; isActive: boolean;
};
const emptyForm: WarehouseForm = {
  code: '', name: '', description: '', address: '', isActive: true,
};

export default function WarehousesManager({ initialWarehouses, canManage }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [form, setForm] = useState<WarehouseForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<WarehouseRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const totals = useMemo(() => ({
    all: initialWarehouses.length,
    active: initialWarehouses.filter((row) => row.isActive).length,
    devices: initialWarehouses.reduce((sum, row) => sum + row.deviceCount, 0),
  }), [initialWarehouses]);
  const filtered = useMemo(() => initialWarehouses.filter((row) => {
    if (onlyActive && !row.isActive) return false;
    const text = `${row.code} ${row.name} ${row.description} ${row.address}`.toLocaleLowerCase();
    return text.includes(search.trim().toLocaleLowerCase());
  }), [initialWarehouses, search, onlyActive]);

  useEffect(() => {
    if (!formOpen) return;
    const oldOverflow = document.body.style.overflow;
    const oldFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) setFormOpen(false);
      if (event.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', handleKey);
      oldFocus?.focus();
    };
  }, [formOpen, busy]);

  function openCreate() {
    setEditing(null); setForm(emptyForm); setError(''); setNotice(''); setFormOpen(true);
  }
  function openEdit(row: WarehouseRow) {
    setEditing(row);
    setForm({ code: row.code, name: row.name, description: row.description, address: row.address, isActive: row.isActive });
    setError(''); setNotice(''); setFormOpen(true);
  }
  async function sendUpdate(id: string, values: WarehouseForm) {
    const response = await fetch(`/api/almacenes/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ name: values.name, description: values.description, address: values.address, isActive: values.isActive }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'No se pudo actualizar el almacén');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canManage) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (editing) await sendUpdate(editing.id, form);
      else {
        const response = await fetch('/api/almacenes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify({ code: form.code, name: form.name, description: form.description, address: form.address }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'No se pudo crear el almacén');
      }
      setFormOpen(false);
      setNotice(editing ? 'Almacén actualizado correctamente.' : 'Almacén creado correctamente.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al guardar el almacén');
    } finally { setBusy(false); }
  }
  async function deactivate() {
    if (!confirmDeactivate || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await sendUpdate(confirmDeactivate.id, {
        code: confirmDeactivate.code, name: confirmDeactivate.name,
        description: confirmDeactivate.description, address: confirmDeactivate.address, isActive: false,
      });
      setNotice(`Almacén ${confirmDeactivate.code} desactivado.`);
      setConfirmDeactivate(null); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo desactivar');
      setConfirmDeactivate(null);
    } finally { setBusy(false); }
  }
  const field = 'w-full min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none focus:border-[var(--app-accent)]';

  return (
    <main className="min-h-[calc(100dvh-68px)] space-y-5 bg-[var(--app-bg)] px-3 py-5 text-[var(--app-fg)] sm:px-5 lg:px-7 lg:py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-accent)]">Administración de ubicaciones</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Almacenes</h1>
          <p className="text-sm text-[var(--app-muted)]">Organiza las ubicaciones y consulta sus existencias reales.</p>
        </div>
        {canManage && <button type="button" onClick={openCreate} className="app-primary min-h-11"><Plus size={18}/> Nuevo almacén</button>}
      </div>

      <section aria-label="Resumen de almacenes" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: 'Almacenes registrados', value: totals.all, icon: Warehouse },
          { label: 'Almacenes activos', value: totals.active, icon: ShieldCheck },
          { label: 'POS en ubicaciones', value: totals.devices, icon: MapPin },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="app-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2 text-sm text-[var(--app-muted)]"><span>{label}</span><Icon size={19} className="text-[var(--app-accent)]" /></div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{value.toLocaleString('es-BO')}</p>
        </div>)}
      </section>

      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="font-semibold">Ubicaciones registradas</h2><p className="text-xs text-[var(--app-muted)]">{filtered.length} resultado(s)</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/api/reports/warehouses" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 text-sm font-semibold hover:bg-[var(--app-hover)]"><Download size={17}/> Exportar resumen</Link>
            <Link href="/movimientos/nuevo" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 text-sm font-semibold hover:bg-[var(--app-hover)]"><ArrowLeftRight size={17}/> Transferir POS</Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-3 text-[var(--app-muted)]"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar código, nombre o dirección" aria-label="Buscar almacenes" className={`${field} pl-10`}/></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyActive} onChange={(event) => setOnlyActive(event.target.checked)} className="accent-[#e94c62]"/> Solo activos</label>
        </div>
        {notice && <p role="status" className="mx-4 mb-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">{notice}</p>}
        {error && !formOpen && <p role="alert" className="mx-4 mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
        {filtered.length === 0 ? <div className="p-10 text-center text-sm text-[var(--app-muted)]">No se encontraron almacenes para esta búsqueda.</div> : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {filtered.map((row) => <article key={row.id} className="flex min-w-0 flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-mono text-xs font-semibold text-[var(--app-accent)]">{row.code}</p><h3 className="mt-1 truncate text-lg font-bold" title={row.name}>{row.name}</h3></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-[var(--app-muted)]'}`}>{row.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
              <p className="mt-3 line-clamp-2 min-h-9 text-sm text-[var(--app-muted)]">{row.address || row.description || 'Sin ubicación adicional registrada'}</p>
              <div className="mt-3 flex items-baseline gap-2 rounded-xl bg-[var(--app-hover)] p-3"><span className="text-2xl font-bold tabular-nums">{row.deviceCount}</span><span className="text-xs text-[var(--app-muted)]">POS ubicados aquí</span></div>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {canManage && <button type="button" onClick={() => openEdit(row)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] px-3 text-sm font-semibold hover:bg-[var(--app-hover)]"><Edit3 size={16}/> Editar</button>}
                {canManage && row.isActive && row.code !== 'ALM-001' && <button type="button" disabled={row.deviceCount > 0} title={row.deviceCount > 0 ? 'Transfiere los POS antes de desactivar' : 'Desactivar almacén'} onClick={() => setConfirmDeactivate(row)} className="inline-flex min-h-10 items-center rounded-xl border border-[var(--app-border)] px-3 text-xs text-[var(--app-muted)] disabled:cursor-not-allowed disabled:opacity-40">Desactivar</button>}
              </div>
            </article>)}
          </div>
        )}
      </section>

      {formOpen && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-3 sm:p-5">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="warehouse-dialog-title" className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5"><h2 id="warehouse-dialog-title" className="text-lg font-bold">{editing ? 'Editar almacén' : 'Nuevo almacén'}</h2><button ref={closeRef} type="button" disabled={busy} onClick={() => setFormOpen(false)} aria-label="Cerrar" className="app-icon-button"><X size={19}/></button></div>
          <form onSubmit={(event) => void submit(event)} className="space-y-4 overflow-y-auto p-5">
            <div><label htmlFor="wh-code" className="mb-1 block text-sm font-semibold">Código *</label><input id="wh-code" required maxLength={20} minLength={3} disabled={Boolean(editing) || busy} value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))} placeholder="ALM-002" className={field}/>{editing && <p className="mt-1 text-xs text-[var(--app-muted)]">El código no puede modificarse.</p>}</div>
            <div><label htmlFor="wh-name" className="mb-1 block text-sm font-semibold">Nombre *</label><input id="wh-name" required minLength={3} maxLength={100} disabled={busy} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Almacén secundario" className={field}/></div>
            <div><label htmlFor="wh-address" className="mb-1 block text-sm font-semibold">Dirección</label><input id="wh-address" maxLength={250} disabled={busy} value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Ciudad, zona o referencia" className={field}/></div>
            <div><label htmlFor="wh-description" className="mb-1 block text-sm font-semibold">Descripción</label><textarea id="wh-description" rows={3} maxLength={500} disabled={busy} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className={field}/></div>
            {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} disabled={busy || editing.code === 'ALM-001' || (editing.deviceCount > 0 && form.isActive)} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} className="accent-[#e94c62]"/> Almacén activo</label>}
            {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-[var(--app-border)] pt-4"><button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="rounded-xl border border-[var(--app-border)] px-4 py-2.5 text-sm font-semibold">Cancelar</button><button type="submit" disabled={busy} className="app-primary"><Check size={17}/>{busy ? 'Guardando...' : 'Guardar almacén'}</button></div>
          </form>
        </div>
      </div>}
      <AlertDialog open={Boolean(confirmDeactivate)} title="¿Desactivar almacén?" description={`El almacén ${confirmDeactivate?.code ?? ''} dejará de estar disponible como destino de transferencias. Esta acción no elimina su historial.`} destructive confirmText="Desactivar" loading={busy} onCancel={() => setConfirmDeactivate(null)} onConfirm={() => void deactivate()} />
    </main>
  );
}
