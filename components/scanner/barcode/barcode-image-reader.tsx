'use client';
import { useState, type ChangeEvent } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
export default function BarcodeImageReader({ onScan }: { onScan: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Selecciona una imagen válida.'); return; }
    if (file.size > 12*1024*1024) { setError('La imagen supera 12 MB.'); return; }
    setBusy(true);setError('');const url = URL.createObjectURL(file);
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
      const hints = new Map<import('@zxing/library').DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.CODE_128,BarcodeFormat.CODE_39,BarcodeFormat.CODE_93,BarcodeFormat.EAN_13,BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER,true);
      const reader = new BrowserMultiFormatReader(hints);
      const result = await reader.decodeFromImageUrl(url);
      const value = result.getText().trim();
      if (!value) throw new Error('La imagen no contiene un código reconocido.');
      onScan(value);
    } catch(e) {setError(e instanceof Error ? `No se pudo decodificar: ${e.message}` : 'No se pudo leer el código.');}
    finally {URL.revokeObjectURL(url);setBusy(false);}
  }
  return <div className="space-y-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700"><ImagePlus size={18}/>{busy ? 'Leyendo imagen...' : 'Leer código desde foto'}<input type="file" accept="image/*" disabled={busy} onChange={e=>void read(e)} className="sr-only"/></label>{busy&&<span className="inline-flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin"/>Procesando...</span>}{error&&<p role="alert" className="text-sm text-amber-800">{error}</p>}</div>;
}
