
'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Camera,
  ImagePlus,
  LoaderCircle,
  ScanText,
} from 'lucide-react';

import OcrConfirmModal from '@/components/inventory/modals/ocr-confirm-modal';

import {
  parseSunmiLabel,
  type SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

type Props = {
  onExtract: (data: SunmiLabelData) => void;
};

const emptyData: SunmiLabelData = {
  imei: '',
  imei2: '',
  serialNumber: '',
  brand: '',
  model: '',
};

export default function ScannerOcr({ onExtract }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [extractedData, setExtractedData] =
    useState<SunmiLabelData>(emptyData);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  function confirmExtraction(data: SunmiLabelData) {
    onExtract(data);
    setModalOpen(false);
  }

  async function processImage(file?: File) {
    if (!file || busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setProgress(0);
    setError('');
    setRawText('');
    setModalOpen(false);

    let worker:
      | Awaited<ReturnType<
          typeof import('tesseract.js')['createWorker']
        >>
      | undefined;

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Selecciona una fotografía válida.');
      }

      if (file.size > 12 * 1024 * 1024) {
        throw new Error(
          'La fotografía supera el límite de 12 MB.',
        );
      }

      const { createWorker, PSM } =
        await import('tesseract.js');

      worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setProgress(
              Math.round((message.progress ?? 0) * 100),
            );
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1',
      });

      const response = await worker.recognize(file);
      const text = response.data.text ?? '';

      setRawText(text);

      const extracted = parseSunmiLabel(text);

      setExtractedData({
        imei: extracted.imei,
        imei2: extracted.imei2,
        serialNumber: extracted.serialNumber,
        brand: extracted.brand || 'SUNMI',
        model: extracted.model || 'V2s / T5940',
      });

      setProgress(100);
      setModalOpen(true);
    } catch (err) {
      console.error('Error de OCR:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible analizar la fotografía.',
      );
    } finally {
      if (worker) {
        await worker.terminate().catch(() => {});
      }

      busyRef.current = false;
      setLoading(false);

      if (cameraRef.current) {
        cameraRef.current.value = '';
      }

      if (galleryRef.current) {
        galleryRef.current.value = '';
      }
    }
  }

  return (
    <>
      <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <ScanText
            size={25}
            className="shrink-0 text-blue-600"
          />

          <div>
            <h2 className="font-semibold text-slate-900">
              Reconocimiento automático OCR
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Fotografía la etiqueta completa para
              extraer IMEI 1, IMEI 2 y S/N.
            </p>
          </div>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={loading}
          className="sr-only"
          aria-label="Tomar fotografía"
          onChange={(event) => {
            void processImage(event.target.files?.[0]);
          }}
        />

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          disabled={loading}
          className="sr-only"
          aria-label="Seleccionar fotografía"
          onChange={(event) => {
            void processImage(event.target.files?.[0]);
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            <Camera size={19} />
            Tomar fotografía
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => galleryRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-3 font-semibold text-blue-700 disabled:opacity-50"
          >
            <ImagePlus size={19} />
            Subir desde galería
          </button>
        </div>

        {loading && (
          <div role="status" className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
              Reconociendo texto...
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-right text-xs text-slate-500">
              {progress}%
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {rawText && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowRawText((value) => !value)}
              className="text-sm font-medium text-blue-700 underline"
            >
              {showRawText
                ? 'Ocultar texto OCR'
                : 'Ver texto reconocido'}
            </button>

            {showRawText && (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-xs text-slate-700">
                {rawText}
              </pre>
            )}
          </div>
        )}
      </section>

      <OcrConfirmModal
        open={modalOpen}
        data={extractedData}
        onClose={closeModal}
        onConfirm={confirmExtraction}
      />
    </>
  );
}
