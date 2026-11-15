import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
  color?: 'blue' | 'green' | 'amber' | 'violet';
};

const tones = {
  // Conservamos el nombre 'blue' por compatibilidad con otras pantallas.
  blue: 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]',
  green: 'bg-emerald-500/10 text-emerald-500',
  amber: 'bg-amber-500/10 text-amber-500',
  violet: 'bg-violet-500/10 text-violet-500',
};

const bar = {
  blue: 'bg-[var(--app-accent)]',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'blue',
}: StatCardProps) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--app-muted)]">{title}</p>
        <span className={`shrink-0 rounded-xl p-2.5 ${tones[color]}`}><Icon size={21} aria-hidden="true" /></span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value.toLocaleString('es-BO')}</p>
      <p className="mt-2 text-xs text-[var(--app-muted)]">{description}</p>
      <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-[3px] ${bar[color]}`} />
    </article>
  );
}
