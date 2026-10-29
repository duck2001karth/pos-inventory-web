
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  ScanText,
  X,
} from 'lucide-react';

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

export default function ScannerOcr({
  onExtract,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [showText, setShowText] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<SunmiLabelData>(emptyData);
  const [confirmed, setConfirmed] = useState(false);

  function updateField(
    field: keyof SunmiLabelData,
    value: string,
  ) {
    setDraft((previous) => ({
      ...previous,
      [field]:
        field === 'imei' || field === 'imei2'
          ? value.replace(/\D/g, '').slice(0, 15)
          : value.toUpperCase(),
    }));
  }

  async function processImage(file?: File) {
    if (!file || busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setProgress(0);
    setError('');
    setRawText('');
    setConfirmed(false);

    let worker:
      | Awaited<ReturnType<
          typeof import('tesseract.js')['createWorker']
        >>
      | undefined;

    try {
      if (
        !file.type.startsWith('image/') &&
        !/\.(jpg|jpeg|png|webp)$/i.test(file.name)
      ) {
        throw new Error(
          'Selecciona una imagen JPG, PNG o WebP.',
        );
      }

      if (file.size > 12 * 1024 * 1024) {
        throw new Error(
          'La imagen supera el límite de 12 MB.',
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

      // Se abre el modal para revisar o completar
      // incluso los campos que OCR no pudo reconocer.
      setDraft({
        imei: extracted.imei,
        imei2: extracted.imei2,
        serialNumber: extracted.serialNumber,
        brand: extracted.brand || 'SUNMI',
        model: extracted.model || 'V2s / T5940',
      });

      setModalOpen(true);
      setProgress(100);
    } catch (err) {
      console.error('Error de OCR:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar la fotografía.',
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

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setModalOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen]);

  const imei1Valid = isValidImei(draft.imei);
  const imei2Valid = isValidImei(draft.imei2);

  const canConfirm =
    imei1Valid &&
    imei2Valid &&
    draft.imei !== draft.imei2 &&
    /^[A-Z0-9-]{6,100}$/.test(draft.serialNumber) &&
    draft.brand.trim().length > 0 &&
    draft.model.trim().length > 0 &&
    confirmed;

  function confirmData() {
    if (!canConfirm) return;

    onExtract({
      imei: draft.imei,
      imei2: draft.imei2,
      serialNumber: draft.serialNumber.trim(),
      brand: draft.brand.trim(),
      model: draft.model.trim(),
    });

    setModalOpen(false);
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
              Captura automática con OCR
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Toma una fotografía completa de la etiqueta
              SUNMI y confirma los datos detectados.
            </p>
          </div>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={loading}
          aria-label="Tomar fotografía de la etiqueta"
          onChange={(event) => {
            void processImage(event.target.files?.[0]);
          }}
        />

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={loading}
          aria-label="Subir fotografía de la etiqueta"
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
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
              Analizando etiqueta...
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
              onClick={() => setShowText((value) => !value)}
              className="text-sm font-medium text-blue-700 underline"
            >
              {showText
                ? 'Ocultar texto reconocido'
                : 'Ver texto reconocido por OCR'}
            </button>

            {showText && (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-xs text-slate-700">
                {rawText}
              </pre>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500">
          La fotografía se procesa en tu navegador.
          Debes verificar los datos antes de registrarlos.
        </p>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ocr-modal-title"
            className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2
                  id="ocr-modal-title"
                  className="text-lg font-bold"
                >
                  Confirmar datos del POS
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Corrige los datos que el OCR no leyó.
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </header>

            <div className="space-y-4 overflow-y-auto px-5 py-5">
              {(
                [
                  {
                    field: 'imei',
                    label: 'IMEI 1',
                    maxLength: 15,
                  },
                  {
                    field: 'imei2',
                    label: 'IMEI 2',
                    maxLength: 15,
                  },
                  {
                    field: 'serialNumber',
                    label: 'S/N',
                    maxLength: 100,
                  },
                  {
                    field: 'brand',
                    label: 'Marca',
                    maxLength: 100,
                  },
                  {
                    field: 'model',
                    label: 'Modelo',
                    maxLength: 100,
                  },
                ] as const
              ).map(({ field, label, maxLength }) => (
                <div key={field} className="space-y-1">
                  <label
                    htmlFor={`ocr-${field}`}
                    className="block text-sm font-semibold"
                  >
                    {label}
                  </label>

                  <input
                    id={`ocr-${field}`}
                    value={draft[field]}
                    maxLength={maxLength}
                    inputMode={
                      field === 'imei' || field === 'imei2'
                        ? 'numeric'
                        : 'text'
                    }
                    autoComplete="off"
                    onChange={(event) => {
                      setConfirmed(false);
                      updateField(field, event.target.value);
                    }}
                    placeholder={`Introduce ${label}`}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-blue-600"
                  />

                  {field === 'imei' &&
                    draft.imei &&
                    !imei1Valid && (
                      <p className="text-xs text-amber-700">
                        IMEI 1 debe tener 15 dígitos y
                        superar la verificación Luhn.
                      </p>
                    )}

                  {field === 'imei2' &&
                    draft.imei2 &&
                    !imei2Valid && (
                      <p className="text-xs text-amber-700">
                        IMEI 2 debe tener 15 dígitos y
                        superar la verificación Luhn.
                      </p>
                    )}
                </div>
              ))}

              {draft.imei &&
                draft.imei === draft.imei2 && (
                  <p className="text-sm text-red-600">
                    Los dos IMEI no pueden ser iguales.
                  </p>
                )}

              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) =>
                    setConfirmed(event.target.checked)
                  }
                  className="mt-1"
                />

                <span>
                  He verificado estos datos contra la
                  etiqueta física del SUNMI.
                </span>
              </label>
            </div>

            <footer className="flex gap-3 border-t bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border px-4 py-3 font-medium"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!canConfirm}
                onClick={confirmData}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                <Check size={18} />
                Confirmar datos
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
