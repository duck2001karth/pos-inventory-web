import { Suspense } from 'react';
import DeviceDetail from '@/components/inventory/detail/device-detail';
import PageLoading from '@/components/ui/page-loading';
type Props = { params: Promise<{ id: string }> };
async function Details({ params }: Props) { const { id } = await params; return <DeviceDetail id={id} />; }
export default function DevicePage({ params }: Props) {
  return <Suspense fallback={<PageLoading label="Cargando ficha del POS..." />}><Details params={params} /></Suspense>;
}
