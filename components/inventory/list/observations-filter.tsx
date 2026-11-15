
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquareText } from 'lucide-react';

type ObservationFilter = 'all' | 'with' | 'without';

export default function ObservationsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selected = searchParams.get('observations') ?? 'all';

  function changeFilter(value: ObservationFilter) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    if (value === 'all') {
      params.delete('observations');
    } else {
      params.set('observations', value);
    }
    params.delete('page');

    const query = params.toString();

    router.push(query ? `/inventario?${query}` : '/inventario');
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label
        htmlFor="observations-filter"
        className="flex items-center gap-2 text-sm font-medium text-slate-700"
      >
        <MessageSquareText size={18} />
        Observaciones
      </label>

      <select
        id="observations-filter"
        value={
          selected === 'with' || selected === 'without'
            ? selected
            : 'all'
        }
        onChange={(event) =>
          changeFilter(event.target.value as ObservationFilter)
        }
        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      >
        <option value="all">Todos los dispositivos</option>
        <option value="with">Con observaciones</option>
        <option value="without">Sin observaciones</option>
      </select>
    </div>
  );
}
