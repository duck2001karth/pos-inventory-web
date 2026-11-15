import { Suspense } from 'react';
import DashboardContent from '@/components/dashboard/dashboard-content';
import PageLoading from '@/components/ui/page-loading';
export default function DashboardPage() {
  return <Suspense fallback={<PageLoading label="Preparando estadísticas..." />}><DashboardContent /></Suspense>;
}
