'use client';

import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, ScanSearch } from 'lucide-react';

type Props = {
  onScan: (value: string) => void;
};

export default function BarcodeImageReader({ onScan }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function readImage(file?: File) {
    if (!file || busy) return;
    setMessage('');
    setBusy(true);
    let url = '';

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Selecciona una fotografía válida.');
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('La fotografía debe ocupar menos de 15 MB.');
      }

      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);

      const hints = new Map<import('@zxing/library').DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.EAN_13,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      url = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(url);
      const value = result.getText().trim();
      if (!value) throw new Error('No se encontró un código legible.');
      onScan(value);
      setMessage('Código reconocido desde la fotografía.');
    } catch (error) {
      setMessage(
        error instanceof Error && error.name !== 'NotFoundException'
          ? error.message
          : 'No se detectó un código. Recorta la imagen para dejar una sola fila de barras, acércala y vuelve a intentar.',
      );
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (inputRef.current) inputRef.current.value = '';
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Seleccionar imagen de barras o QR"
        className="sr-only"
        disabled={busy}
        onChange={(event) => void readImage(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 px-5 py-5 font-semibold text-orange-800 transition hover:border-orange-400 hover:bg-orange-100 disabled:opacity-50"
      >
        {busy ? <LoaderCircle size={22} className="animate-spin" /> : <ImagePlus size={22} />}
        {busy ? 'Analizando fotografía…' : 'Seleccionar foto de un código'}
      </button>
      <p className="flex items-start gap-2 text-sm text-slate-500">
        <ScanSearch size={18} className="mt-0.5 shrink-0" />
        En etiquetas SUNMI, fotografía de cerca una única barra, sin incluir las otras filas.
      </p>
      {message && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
