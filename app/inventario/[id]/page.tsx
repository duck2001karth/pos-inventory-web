import { Suspense } from 'react';
import DeviceDetail from '@/components/inventory/detail/device-detail';
type Props = { params: Promise<{ id: string }> };
async function Result({ params }: Props) { const { id } = await params; return <DeviceDetail id={id}/>; }
export default function DevicePage({ params }: Props) {
  return <Suspense fallback={<main className="p-8 text-slate-500">Cargando dispositivo...</main>}><Result params={params}/></Suspense>;
}
