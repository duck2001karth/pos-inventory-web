import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
  color?: 'blue' | 'green' | 'amber' | 'violet';
};

const colors = {
  blue: 'bg-blue-500/10 text-blue-500',
  green: 'bg-emerald-500/10 text-emerald-500',
  amber: 'bg-amber-500/10 text-amber-500',
  violet: 'bg-violet-500/10 text-violet-500',
};

export default function StatCard({
  title, value, icon: Icon, description, color = 'blue',
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--app-muted)]">{title}</p>
        <div className={`rounded-xl p-3 ${colors[color]}`}><Icon size={22} aria-hidden="true" /></div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value.toLocaleString('es-BO')}</p>
      <p className="mt-2 text-xs text-[var(--app-muted)]">{description}</p>
      <div className={`absolute bottom-0 left-0 h-1 w-full ${color === 'green' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : color === 'violet' ? 'bg-violet-500' : 'bg-blue-500'}`} />
    </div>
  );
}
