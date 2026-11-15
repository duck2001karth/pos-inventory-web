import { Suspense } from 'react';
import MovementsContent from '@/components/movements/movements-content';
import PageLoading from '@/components/ui/page-loading';
export default function MovementsPage() { return <Suspense fallback={<PageLoading label="Cargando movimientos..." />}><MovementsContent /></Suspense>; }
