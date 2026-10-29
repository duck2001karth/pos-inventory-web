
import { Suspense } from 'react';
import DashboardContent from '@/components/dashboard/dashboard-content';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-slate-500 md:p-8">
          Cargando dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
