
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  FileText,
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

type ScannerOcrProps = {
  onExtract: (data: SunmiLabelData) => void;
};

type ModelOption =
  | ''
  | 'V2s / T5940'
  | 'V2 PRO / T5921';

type OcrDraft = SunmiLabelData & {
  meid: string;
};

const emptyDraft: OcrDraft = {
  imei: '',
  imei2: '',
  serialNumber: '',
  brand: '',
  model: '',
  meid: '',
};

function normalizeModel(value: string): ModelOption {
  const normalized = value.toUpperCase();

  if (
    normalized.includes('T5940') ||
    normalized.includes('V2S')
  ) {
    return 'V2s / T5940';
  }

  if (
    normalized.includes('T5921') ||
    normalized.includes('V2 PRO')
  ) {
    return 'V2 PRO / T5921';
  }

  return '';
}

function countIdentifiers(data: SunmiLabelData): number {
  return [
    data.imei,
    data.imei2,
    data.serialNumber,
  ].filter(Boolean).length;
}

export default function ScannerOcr({
  onExtract,
}: ScannerOcrProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [showText, setShowText] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<OcrDraft>(emptyDraft);
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [confirmedMessage, setConfirmedMessage] = useState('');

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  function updateField(
    field: keyof OcrDraft,
    value: string,
  ) {
    setReviewed(false);

    setDraft((previous) => {
      if (field === 'imei' || field === 'imei2') {
        return {
          ...previous,
          [field]: value.replace(/\D/g, '').slice(0, 15),
        };
      }

      if (field === 'serialNumber') {
        return {
          ...previous,
          serialNumber: value
            .toUpperCase()
            .replace(/\s/g, '')
            .slice(0, 100),
        };
      }

      if (field === 'meid') {
        return {
          ...previous,
          meid: value
            .toUpperCase()
            .replace(/[^A-F0-9]/g, '')
            .slice(0, 14),
        };
      }

      return {
        ...previous,
        [field]: value.slice(0, 100),
      };
    });
  }

  async function processImage(file?: File) {
    if (!file || busyRef.current) return;

    busyRef.current = true;

    setLoading(true);
    setProgress(0);
    setStatus('Preparando fotografía...');
    setError('');
    setRawText('');
    setShowText(false);
    setRecognizedCount(0);
    setReviewed(false);
    setConfirmedMessage('');

    let worker:
      | Awaited<
          ReturnType<
            typeof import('tesseract.js')['createWorker']
          >
        >
      | undefined;

    try {
      const supported =
        file.type.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp)$/i.test(file.name);

      if (!supported) {
        throw new Error(
          'Selecciona una fotografía JPG, PNG o WebP.',
        );
      }

      if (file.size > 12 * 1024 * 1024) {
        throw new Error(
          'La fotografía supera los 12 MB. ' +
          'Reduce su tamaño e inténtalo nuevamente.',
        );
      }

      setStatus('Cargando motor de reconocimiento...');

      const { createWorker, PSM } =
        await import('tesseract.js');

      worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (!mountedRef.current) return;

          if (message.status === 'recognizing text') {
            setStatus('Reconociendo texto de la etiqueta...');

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

      setStatus('Extrayendo los identificadores...');

      const response = await worker.recognize(file);
      const text = response.data.text ?? '';

      const extracted = parseSunmiLabel(text);

      if (!mountedRef.current) return;

      setRawText(text);
      setRecognizedCount(countIdentifiers(extracted));

      setDraft({
        imei: extracted.imei || '',
        imei2: extracted.imei2 || '',
        serialNumber: extracted.serialNumber || '',
        brand: extracted.brand || '',
        model: normalizeModel(extracted.model),
        meid: extracted.meid || '',
      });

      setProgress(100);
      setStatus('Reconocimiento finalizado.');
      setModalOpen(true);
    } catch (err) {
      console.error('Error de OCR:', err);

      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo analizar la fotografía.',
        );
      }
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Liberar el worker sin ocultar otro error.
        }
      }

      busyRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }

      if (cameraRef.current) {
        cameraRef.current.value = '';
      }

      if (galleryRef.current) {
        galleryRef.current.value = '';
      }
    }
  }

  function closeModal() {
    setModalOpen(false);
    setReviewed(false);
  }

  useEffect(() => {
    if (!modalOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setModalOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll<
        HTMLElement
      >(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      );

      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
      previousFocusRef.current?.focus();
    };
  }, [modalOpen]);

  const isV2s = draft.model === 'V2s / T5940';
  const isV2Pro = draft.model === 'V2 PRO / T5921';

  const imei1Valid = isValidImei(draft.imei);

  const imei2Valid = isV2s
    ? isValidImei(draft.imei2)
    : !draft.imei2 || isValidImei(draft.imei2);

  const serialValid =
    /^[A-Z0-9-]{6,100}$/.test(draft.serialNumber);

  const differentImeis =
    !draft.imei2 || draft.imei !== draft.imei2;

  const brandValid =
    draft.brand.trim().toUpperCase() === 'SUNMI';

  const meidValid =
    !draft.meid || /^[A-F0-9]{14}$/.test(draft.meid);

  const canConfirm =
    (isV2s || isV2Pro) &&
    imei1Valid &&
    imei2Valid &&
    serialValid &&
    differentImeis &&
    brandValid &&
    meidValid &&
    reviewed;

  function confirmData() {
    if (!canConfirm) return;

    onExtract({
      imei: draft.imei,
      imei2: draft.imei2,
      serialNumber: draft.serialNumber.trim(),
      brand: 'SUNMI',
      model: draft.model,
      meid: draft.meid || undefined,
    });

    setConfirmedMessage(
      'Datos confirmados. Revisa el formulario y ' +
      'comprueba duplicados antes de registrar.',
    );

    closeModal();
  }

  return (
    <>
      <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-slate-900">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <ScanText size={25} />
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold">
              Captura automática con OCR
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Toma una fotografía de la etiqueta SUNMI.
              El sistema intentará identificar el modelo,
              S/N y los IMEI disponibles.
            </p>
          </div>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={loading}
          aria-label="Tomar fotografía de la etiqueta"
          className="sr-only"
          onChange={(event) => {
            void processImage(event.target.files?.[0]);
          }}
        />

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          disabled={loading}
          aria-label="Seleccionar fotografía de la galería"
          className="sr-only"
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
            className="space-y-3 rounded-xl bg-white p-4"
          >
            <div className="flex items-center gap-2 text-sm">
              <LoaderCircle
                size={19}
                className="animate-spin text-blue-600"
              />
              {status}
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-right text-xs text-slate-500">
              {progress}%
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertTriangle
              size={19}
              className="shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        {confirmedMessage && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            <CheckCircle2
              size={19}
              className="shrink-0"
            />
            <span>{confirmedMessage}</span>
          </div>
        )}

        {rawText && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowText((value) => !value)}
              className="flex items-center gap-2 text-sm font-medium text-blue-700 underline"
            >
              <FileText size={17} />
              {showText
                ? 'Ocultar texto reconocido'
                : 'Ver texto reconocido por OCR'}
            </button>

            {showText && (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-white p-3 text-xs text-slate-700">
                {rawText}
              </pre>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500">
          La imagen se procesa en el navegador.
          El OCR puede confundir caracteres: confirma
          siempre los datos con la etiqueta física.
        </p>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ocr-modal-title"
            aria-describedby="ocr-modal-description"
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b p-5">
              <div>
                <h2
                  id="ocr-modal-title"
                  className="text-lg font-bold"
                >
                  Confirmar datos SUNMI
                </h2>

                <p
                  id="ocr-modal-description"
                  className="mt-1 text-sm text-slate-500"
                >
                  Revisa los identificadores antes de
                  pasarlos al formulario.
                </p>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                aria-label="Cerrar ventana"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </header>

            <div className="space-y-5 overflow-y-auto overscroll-contain p-5">
              <div
                className={`rounded-xl border p-3 text-sm ${
                  recognizedCount === 3
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                OCR reconoció {recognizedCount} de 3
                identificadores posibles. Los campos
                faltantes pueden completarse manualmente.
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ocr-model"
                  className="block text-sm font-semibold"
                >
                  Modelo SUNMI *
                </label>

                <select
                  id="ocr-model"
                  value={normalizeModel(draft.model)}
                  onChange={(event) => {
                    setReviewed(false);

                    setDraft((previous) => ({
                      ...previous,
                      model: event.target.value,
                      imei2: previous.imei2,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base focus:border-blue-600"
                >
                  <option value="">
                    Selecciona el modelo
                  </option>
                  <option value="V2s / T5940">
                    SUNMI V2s — T5940
                  </option>
                  <option value="V2 PRO / T5921">
                    SUNMI V2 PRO — T5921
                  </option>
                </select>

                <p className="text-xs text-slate-500">
                  Selecciona el modelo indicado en
                  la etiqueta, aunque el OCR sugiera otro.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ocr-brand"
                  className="block text-sm font-semibold"
                >
                  Marca *
                </label>

                <input
                  id="ocr-brand"
                  value={draft.brand}
                  maxLength={100}
                  onChange={(event) =>
                    updateField('brand', event.target.value)
                  }
                  placeholder="SUNMI"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 p-3 text-base focus:border-blue-600"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ocr-serial"
                  className="block text-sm font-semibold"
                >
                  S/N — Número de serie *
                </label>

                <input
                  id="ocr-serial"
                  value={draft.serialNumber}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(event) =>
                    updateField(
                      'serialNumber',
                      event.target.value,
                    )
                  }
                  placeholder="Número de serie impreso"
                  className="w-full rounded-xl border border-slate-300 p-3 font-mono text-base focus:border-blue-600"
                />

                {draft.serialNumber && !serialValid && (
                  <p className="text-xs text-red-600">
                    El S/N debe tener entre 6 y 100
                    caracteres alfanuméricos.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ocr-imei1"
                  className="block text-sm font-semibold"
                >
                  IMEI 1 *
                </label>

                <input
                  id="ocr-imei1"
                  value={draft.imei}
                  inputMode="numeric"
                  maxLength={15}
                  autoComplete="off"
                  onChange={(event) =>
                    updateField('imei', event.target.value)
                  }
                  placeholder="15 dígitos"
                  className="w-full rounded-xl border border-slate-300 p-3 font-mono text-base focus:border-blue-600"
                />

                {draft.imei && !imei1Valid && (
                  <p className="text-xs text-amber-700">
                    Revisa los 15 dígitos del IMEI 1
                    y su dígito de control.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ocr-imei2"
                  className="block text-sm font-semibold"
                >
                  IMEI 2{' '}
                  {isV2s
                    ? '(obligatorio para V2s) *'
                    : '(opcional para V2 PRO)'}
                </label>

                <input
                  id="ocr-imei2"
                  value={draft.imei2}
                  inputMode="numeric"
                  maxLength={15}
                  autoComplete="off"
                  onChange={(event) =>
                    updateField('imei2', event.target.value)
                  }
                  placeholder={
                    isV2s
                      ? 'Segundo IMEI, 15 dígitos'
                      : 'Dejar vacío si no existe'
                  }
                  className="w-full rounded-xl border border-slate-300 p-3 font-mono text-base focus:border-blue-600"
                />

                {draft.imei2 && !imei2Valid && (
                  <p className="text-xs text-amber-700">
                    Verifica el IMEI 2 antes de continuar.
                  </p>
                )}

                {!differentImeis && (
                  <p className="text-xs text-red-600">
                    IMEI 1 e IMEI 2 deben ser diferentes.
                  </p>
                )}
              </div>

              {isV2Pro && (
                <div className="space-y-2">
                  <label
                    htmlFor="ocr-meid"
                    className="block text-sm font-semibold"
                  >
                    MEID (opcional)
                  </label>

                  <input
                    id="ocr-meid"
                    value={draft.meid}
                    maxLength={14}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField('meid', event.target.value)
                    }
                    placeholder="14 caracteres hexadecimales"
                    className="w-full rounded-xl border border-slate-300 p-3 font-mono text-base focus:border-blue-600"
                  />

                  <p className="text-xs text-slate-500">
                    El MEID no reemplaza al IMEI 2.
                    Todavía no se guarda en la tabla
                    Device; requiere una migración.
                  </p>

                  {draft.meid && !meidValid && (
                    <p className="text-xs text-amber-700">
                      Comprueba los 14 caracteres del MEID.
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-start gap-3 rounded-xl border bg-slate-50 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) =>
                    setReviewed(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <span>
                  He verificado el modelo y los
                  identificadores contra la etiqueta
                  física del dispositivo.
                </span>
              </label>
            </div>

            <footer className="flex shrink-0 gap-3 border-t bg-white p-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700"
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
                Confirmar
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
