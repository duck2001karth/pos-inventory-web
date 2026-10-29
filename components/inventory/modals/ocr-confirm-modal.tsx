
'use client';

import { useEffect, useId, useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

import {
  isValidImei,
  type SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

type OcrConfirmModalProps = {
  open: boolean;
  data: SunmiLabelData;
  onClose: () => void;
  onConfirm: (data: SunmiLabelData) => void;
};

const fields = [
  {
    key: 'imei',
    label: 'IMEI 1',
    maxLength: 15,
  },
  {
    key: 'imei2',
    label: 'IMEI 2',
    maxLength: 15,
  },
  {
    key: 'serialNumber',
    label: 'S/N',
    maxLength: 100,
  },
  {
    key: 'brand',
    label: 'Marca',
    maxLength: 100,
  },
  {
    key: 'model',
    label: 'Modelo',
    maxLength: 100,
  },
] as const;

export default function OcrConfirmModal({
  open,
  data,
  onClose,
  onConfirm,
}: OcrConfirmModalProps) {
  const titleId = useId();

  const [draft, setDraft] = useState<SunmiLabelData>(data);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    if (!open) return;

    setDraft({ ...data });
    setReviewed(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, data, onClose]);

  if (!open) return null;

  function updateField(
    field: keyof SunmiLabelData,
    value: string,
  ) {
    setReviewed(false);

    setDraft((previous) => ({
      ...previous,
      [field]:
        field === 'imei' || field === 'imei2'
          ? value.replace(/\D/g, '').slice(0, 15)
          : value.toUpperCase(),
    }));
  }

  const imei1Valid = isValidImei(draft.imei);
  const imei2Valid = isValidImei(draft.imei2);

  const serialValid =
    /^[A-Z0-9-]{6,100}$/.test(draft.serialNumber.trim());

  const valid =
    imei1Valid &&
    imei2Valid &&
    draft.imei !== draft.imei2 &&
    serialValid &&
    draft.brand.trim().length > 0 &&
    draft.model.trim().length > 0;

  function confirm() {
    if (!valid || !reviewed) return;

    onConfirm({
      imei: draft.imei,
      imei2: draft.imei2,
      serialNumber: draft.serialNumber.trim(),
      brand: draft.brand.trim(),
      model: draft.model.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id={titleId}
              className="text-lg font-bold"
            >
              Confirmar datos del POS
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Revisa los identificadores reconocidos
              antes de continuar.
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          {fields.map(({ key, label, maxLength }) => (
            <div key={key} className="space-y-1">
              <label
                htmlFor={`${titleId}-${key}`}
                className="block text-sm font-semibold"
              >
                {label}
              </label>

              <input
                id={`${titleId}-${key}`}
                value={draft[key]}
                maxLength={maxLength}
                autoComplete="off"
                inputMode={
                  key === 'imei' || key === 'imei2'
                    ? 'numeric'
                    : 'text'
                }
                onChange={(event) =>
                  updateField(key, event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-blue-600"
              />
            </div>
          ))}

          {!imei1Valid && draft.imei && (
            <p className="text-sm text-amber-700">
              Comprueba IMEI 1: debe tener 15 dígitos
              y un dígito de control válido.
            </p>
          )}

          {!imei2Valid && draft.imei2 && (
            <p className="text-sm text-amber-700">
              Comprueba IMEI 2: debe tener 15 dígitos
              y un dígito de control válido.
            </p>
          )}

          {draft.imei && draft.imei === draft.imei2 && (
            <p className="text-sm text-red-600">
              IMEI 1 e IMEI 2 no pueden ser iguales.
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />
            <p>
              El OCR puede confundir caracteres.
              Verifica los valores directamente
              contra la etiqueta física.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) =>
                setReviewed(event.target.checked)
              }
              className="mt-1"
            />

            <span>
              Confirmo que IMEI 1, IMEI 2 y S/N
              coinciden con el dispositivo.
            </span>
          </label>
        </div>

        <footer className="flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-medium"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!valid || !reviewed}
            onClick={confirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            <Check size={18} />
            Confirmar datos
          </button>
        </footer>
      </div>
    </div>
  );
}
