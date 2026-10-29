
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

type Props = {
  initialSearch: string;
};

export default function InventorySearch({
  initialSearch,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const term = search.trim();

    router.push(
      term
        ? `/inventario?q=${encodeURIComponent(term)}`
        : '/inventario',
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <div className="relative min-w-0 flex-1 sm:min-w-64">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="S/N, IMEI, código o modelo"
          maxLength={100}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-600"
        />
      </div>

      <button
        type="submit"
        className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
      >
        Buscar
      </button>

      {initialSearch && (
        <button
          type="button"
          onClick={() => {
            setSearch('');
            router.push('/inventario');
          }}
          aria-label="Limpiar búsqueda"
          className="rounded-xl border px-3"
        >
          <X size={18} />
        </button>
      )}
    </form>
  );
}
