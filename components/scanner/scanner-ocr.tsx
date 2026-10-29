
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
  isValidImei,
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

function mergeResults(
  first: SunmiLabelData,
  second: SunmiLabelData,
): SunmiLabelData {
  function chooseImei(a: string, b: string) {
    if (isValidImei(a)) return a;
    if (isValidImei(b)) return b;
    return a || b;
  }

  return {
    imei: chooseImei(first.imei, second.imei),
    imei2: chooseImei(first.imei2, second.imei2),
    serialNumber:
      first.serialNumber || second.serialNumber,
    brand: first.brand || second.brand || 'SUNMI',
    model:
      first.model || second.model || 'V2s / T5940',
  };
}

export default function ScannerOcr({
  onExtract,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
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
    setStatus('Preparando imagen...');
    setError('');
    setRawText('');
    setShowRawText(false);
    setModalOpen(false);

    let worker:
      | Awaited<
          ReturnType<
            typeof import('tesseract.js')['createWorker']
          >
        >
      | undefined;

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error(
          'Selecciona una fotografía válida.',
        );
      }

      if (file.size > 12 * 1024 * 1024) {
        throw new Error(
          'La fotografía supera el límite de 12 MB.',
        );
      }

      setStatus('Cargando motor OCR...');

      const { createWorker, PSM } =
        await import('tesseract.js');

      worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            const currentProgress = Math.round(
              (message.progress ?? 0) * 100,
            );

            setProgress(currentProgress);
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1',
      });

      // Primera pasada: etiqueta completa.
      setStatus('Leyendo etiqueta completa...');
      setProgress(0);

      const firstResponse = await worker.recognize(file);

      const firstText = firstResponse.data.text ?? '';
      const firstData = parseSunmiLabel(firstText);

      // Segunda pasada: zona de los códigos.
      // La etiqueta SUNMI normalmente coloca
      // IMEI1, IMEI2 y SN en la parte inferior.
      setStatus('Mejorando lectura de IMEI y S/N...');
      setProgress(0);

      let secondText = '';
      let secondData: SunmiLabelData = {
        ...emptyData,
      };

      try {
        const bitmap = await createImageBitmap(file);

        try {
          const cropTop = Math.floor(
            bitmap.height * 0.35,
          );

          const cropHeight =
            bitmap.height - cropTop;

          const secondResponse =
            await worker.recognize(file, {
              rectangle: {
                left: 0,
                top: cropTop,
                width: bitmap.width,
                height: cropHeight,
              },
            });

          secondText =
            secondResponse.data.text ?? '';

          secondData = parseSunmiLabel(secondText);
        } finally {
          bitmap.close();
        }
      } catch (secondPassError) {
        // Si el navegador no puede procesar
        // la segunda región, conservamos
        // los resultados de la primera pasada.
        console.warn(
          'No se pudo completar segunda lectura OCR:',
          secondPassError,
        );
      }

      const extracted = mergeResults(
        firstData,
        secondData,
      );

      setRawText(
        [
          '=== ETIQUETA COMPLETA ===',
          firstText || '(Sin texto detectado)',
          '',
          '=== ZONA DE IDENTIFICADORES ===',
          secondText || '(Sin texto detectado)',
        ].join('\n'),
      );

      setExtractedData(extracted);
      setProgress(100);

      const count = [
        extracted.imei,
        extracted.imei2,
        extracted.serialNumber,
      ].filter(Boolean).length;

      setStatus(
        `Reconocimiento completado: ${count} de 3 identificadores.`,
      );

      // Abrimos el modal incluso si faltan datos
      // para permitir la corrección manual.
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
        try {
          await worker.terminate();
        } catch (err) {
          console.warn(
            'No se pudo liberar el worker OCR:',
            err,
          );
        }
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
              Fotografía la etiqueta SUNMI completa
              para extraer IMEI 1, IMEI 2 y S/N.
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
          <div
            role="status"
            className="space-y-2 rounded-lg bg-white p-3"
          >
            <div className="flex items-center gap-2 text-sm text-slate-600">
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

        {!loading && status && !error && (
          <p
            role="status"
            className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
          >
            {status}
          </p>
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
              onClick={() =>
                setShowRawText((previous) => !previous)
              }
              className="text-sm font-medium text-blue-700 underline"
            >
              {showRawText
                ? 'Ocultar texto OCR'
                : 'Ver texto reconocido'}
            </button>

            {showRawText && (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-xs text-slate-700">
                {rawText}
              </pre>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500">
          El OCR procesa la imagen en tu navegador.
          Los identificadores deben revisarse
          contra la etiqueta física antes de guardar.
        </p>
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
