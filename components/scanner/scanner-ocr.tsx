
'use client';

import { useRef, useState } from 'react';
import {
  Camera,
  ImagePlus,
  LoaderCircle,
  ScanText,
} from 'lucide-react';

import {
  parseSunmiLabel,
  type SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

type ScannerOcrProps = {
  onExtract: (data: SunmiLabelData) => void;
};

export default function ScannerOcr({
  onExtract,
}: ScannerOcrProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [showText, setShowText] = useState(false);
  const [found, setFound] = useState(0);

  async function processImage(file?: File) {
    if (!file || busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setProgress(0);
    setError('');
    setRawText('');
    setFound(0);
    setStatus('Preparando imagen...');

    try {
      if (
        !file.type.startsWith('image/') &&
        !/\.(jpe?g|png|webp)$/i.test(file.name)
      ) {
        throw new Error(
          'Selecciona una imagen JPG, PNG o WebP.',
        );
      }

      if (file.size > 12 * 1024 * 1024) {
        throw new Error(
          'La imagen supera 12 MB. Reduce su tamaño.',
        );
      }

      setStatus('Cargando motor OCR...');

      const { createWorker, PSM } =
        await import('tesseract.js');

      const worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setStatus('Reconociendo texto...');

            setProgress(
              Math.round((message.progress ?? 0) * 100),
            );
          }
        },
      });

      let text = '';

      try {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
        });

        const response = await worker.recognize(file);

        text = response.data.text ?? '';
      } finally {
        await worker.terminate();
      }

      setRawText(text);

      const extracted = parseSunmiLabel(text);

      const recognizedCount = [
        extracted.imei,
        extracted.imei2,
        extracted.serialNumber,
      ].filter(Boolean).length;

      setFound(recognizedCount);
      setProgress(100);

      if (recognizedCount === 0) {
        setError(
          'No se encontraron IMEI 1, IMEI 2 ni S/N ' +
          'con suficiente claridad. Prueba con una ' +
          'fotografía más nítida o revisa el texto OCR.',
        );
      } else {
        onExtract(extracted);

        setStatus(
          `Reconocimiento finalizado: ${recognizedCount} de 3 identificadores.`,
        );
      }
    } catch (err) {
      console.error('Error de reconocimiento OCR:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar la fotografía.',
      );
    } finally {
      busyRef.current = false;
      setLoading(false);

      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }

      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
          <ScanText size={24} />
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">
            Reconocimiento automático OCR
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Fotografía la etiqueta SUNMI completa
            para extraer IMEI 1, IMEI 2 y S/N.
          </p>
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={loading}
        className="sr-only"
        aria-label="Tomar fotografía de etiqueta"
        onChange={(event) => {
          void processImage(event.target.files?.[0]);
        }}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        disabled={loading}
        className="sr-only"
        aria-label="Seleccionar fotografía"
        onChange={(event) => {
          void processImage(event.target.files?.[0]);
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          <Camera size={19} />
          Tomar fotografía
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-3 font-semibold text-blue-700 disabled:opacity-50"
        >
          <ImagePlus size={19} />
          Subir desde galería
        </button>
      </div>

      {loading && (
        <div
          role="status"
          className="space-y-2 rounded-lg bg-white p-3"
        >
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
            {status}
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-right text-xs text-slate-500">
            {progress}%
          </p>
        </div>
      )}

      {!loading && found > 0 && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {status}
          <p className="mt-1">
            Revisa y corrige los valores antes de guardar.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {rawText && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowText((previous) => !previous)}
            className="text-sm font-medium text-blue-700 underline"
          >
            {showText
              ? 'Ocultar texto reconocido'
              : 'Ver texto reconocido por OCR'}
          </button>

          {showText && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-white p-3 text-xs text-slate-700">
              {rawText}
            </pre>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        El reconocimiento se realiza en este dispositivo.
        El OCR puede cometer errores; verifica siempre
        los números impresos en la etiqueta.
      </p>
    </section>
  );
}
