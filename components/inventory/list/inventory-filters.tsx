
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import Button from '@/components/ui/button';

type Props = {
  initialQuery: string;
  initialModel: string;
  initialStatus: string;
};

export default function InventoryFilters({
  initialQuery,
  initialModel,
  initialStatus,
}: Props) {
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [model, setModel] = useState(initialModel);
  const [status, setStatus] = useState(initialStatus);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (query.trim()) {
      params.set('q', query.trim());
    }

    if (model) {
      params.set('model', model);
    }

    if (status) {
      params.set('status', status);
    }

    const search = params.toString();

    router.push(
      search
        ? `/inventario?${search}`
        : '/inventario',
    );
  }

  function clear() {
    setQuery('');
    setModel('');
    setStatus('');
    router.push('/inventario');
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_auto_auto]"
    >
      <div className="relative">
        <Search
          size={19}
          className="pointer-events-none absolute left-3 top-3 text-slate-400"
        />
        <input
          aria-label="Buscar dispositivo"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Código, S/N o IMEI..."
          maxLength={100}
          className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
        />
      </div>

      <select
        aria-label="Filtrar por modelo"
        value={model}
        onChange={(event) =>
          setModel(event.target.value)
        }
        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      >
        <option value="">Todos los modelos</option>
        <option value="V2s / T5940">SUNMI V2s</option>
        <option value="V2 PRO / T5921">SUNMI V2 PRO</option>
      </select>

      <select
        aria-label="Filtrar por estado"
        value={status}
        onChange={(event) =>
          setStatus(event.target.value)
        }
        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      >
        <option value="">Todos los estados</option>
        <option value="IN_STOCK">En almacén</option>
        <option value="ASSIGNED">Asignados</option>
        <option value="IN_REPAIR">En reparación</option>
      </select>

      <Button type="submit">
        <Search size={17} />
        Buscar
      </Button>

      <Button
        variant="secondary"
        onClick={clear}
      >
        Limpiar
      </Button>
    </form>
  );
}
