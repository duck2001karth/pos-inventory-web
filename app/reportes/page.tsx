import { Suspense } from 'react';

import ReportsContent from '@/components/reports/reports-content';
import PageLoading from '@/components/ui/page-loading';
import './reports-print.css';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function ReportsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageLoading label="Preparando reportes..." />}>
      <ReportsContent searchParams={searchParams} />
    </Suspense>
  );
}
