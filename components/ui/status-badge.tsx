
type StatusBadgeProps = {
  status: string;
};

const statusMap: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  IN_STOCK: {
    label: 'En almacén',
    className: 'bg-green-100 text-green-800',
  },
  ASSIGNED: {
    label: 'Asignado',
    className: 'bg-blue-100 text-blue-800',
  },
  IN_REPAIR: {
    label: 'En reparación',
    className: 'bg-amber-100 text-amber-800',
  },
  RETIRED: {
    label: 'Retirado',
    className: 'bg-slate-200 text-slate-700',
  },
};

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  const config = statusMap[status] ?? {
    label: status.replaceAll('_', ' '),
    className: 'bg-slate-100 text-slate-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
