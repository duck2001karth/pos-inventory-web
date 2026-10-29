
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  ScanText,
} from 'lucide-react';

import type {
  SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

import OcrCapture from './ocr-capture';
import OcrConfirmModal from './ocr-confirm-modal';
import { recognizeSunmiLabel } from './recognize-label';

type Props = {
  onExtract: (data: SunmiLabelData) => void;
};

const emptyData: SunmiLabelData = {
  imei: '',
  imei2: '',
  serialNumber: '',
  brand: '',
  model: '',
  meid: '',
};

export default function ScannerOcr({
  onExtract,
}: Props) {
  const busyRef = useRef(false);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [imageUrl, setImageUrl] = useState('');
  const imageUrlRef = useRef('');

  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  const [data, setData] =
    useState<SunmiLabelData>(emptyData);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = '';
      }
    };
  }, []);

  async function handleImage(file: File) {
    if (busyRef.current) return;

    busyRef.current = true;

    setLoading(true);
    setProgress(0);
    setStatus('Preparando imagen...');
    setError('');
    setSuccess('');
    setModalOpen(false);
    setShowRawText(false);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Selecciona un archivo de imagen.');
      }

      if (file.size > 12 * 1024 * 1024) {
        throw new Error('La fotografía supera 12 MB.');
      }

      const result = await recognizeSunmiLabel(
        file,
        (percentage, message) => {
          if (!mountedRef.current) return;

          setProgress(percentage);
          setStatus(message);
        },
      );

      if (!mountedRef.current) return;

      const nextUrl = URL.createObjectURL(file);

      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }

      imageUrlRef.current = nextUrl;
      setImageUrl(nextUrl);

      setData(result.data);
      setRawText(result.rawText);
      setModalOpen(true);
    } catch (err) {
      if (!mountedRef.current) return;

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo analizar la etiqueta.',
      );
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  function handleConfirm(confirmed: SunmiLabelData) {
    onExtract(confirmed);

    setModalOpen(false);
    setSuccess(
      'Datos confirmados. Revisa el formulario ' +
      'y comprueba duplicados antes de registrar.',
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 text-slate-900">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
          <ScanText size={24} />
        </div>

        <div>
          <h2 className="font-semibold">
            Reconocimiento de etiquetas SUNMI
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Fotografía la etiqueta completa. El sistema
            realizará dos lecturas y abrirá una ventana
            para confirmar los datos.
          </p>
        </div>
      </div>

      <OcrCapture
        disabled={loading}
        onImage={(file) => void handleImage(file)}
      />

      {loading && (
        <div role="status" className="space-y-3 rounded-xl bg-white p-4">
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
        <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={19} className="shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="flex gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 size={19} className="shrink-0" />
          {success}
        </div>
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
              : 'Ver lecturas OCR'}
          </button>

          {showRawText && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-white p-3 text-xs">
              {rawText}
            </pre>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        La imagen se procesa localmente. Comprueba
        siempre los identificadores antes de guardarlos.
      </p>

      <OcrConfirmModal
        open={modalOpen}
        initialData={data}
        imageUrl={imageUrl}
        onCancel={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </section>
  );
}
