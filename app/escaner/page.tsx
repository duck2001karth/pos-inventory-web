import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import BarcodeScannerPage from '@/components/scanner/barcode-scanner-page';
async function ProtectedScanner() {
  await requireUser();
  return <BarcodeScannerPage />;
}
export default function EscanerPage() {
  return <Suspense fallback={<main className="p-8 text-slate-500">Verificando sesión...</main>}><ProtectedScanner /></Suspense>;
}
