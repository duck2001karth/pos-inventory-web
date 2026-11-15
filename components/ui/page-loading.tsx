import { LoaderCircle, ScanLine } from 'lucide-react';

export default function PageLoading({ label = 'Cargando información...' }: { label?: string }) {
  return (
    <main role="status" aria-live="polite" className="flex min-h-[calc(100dvh-72px)] items-center justify-center bg-[var(--app-bg)] p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <ScanLine size={25} className="text-[var(--app-accent)]" />
          <LoaderCircle size={59} className="absolute animate-spin text-[var(--app-accent)]/40" strokeWidth={1.2} />
        </div>
        <div><p className="font-semibold text-[var(--app-fg)]">{label}</p><p className="mt-1 text-xs text-[var(--app-muted)]">POS Control · Centro de operaciones</p></div>
      </div>
    </main>
  );
}
