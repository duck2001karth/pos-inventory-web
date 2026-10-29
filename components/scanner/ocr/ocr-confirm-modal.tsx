
'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

import {
  isValidImei,
  type SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

type Props = {
  open: boolean;
  initialData: SunmiLabelData;
  imageUrl: string;
  onCancel: () => void;
  onConfirm: (data: SunmiLabelData) => void;
};

const models = [
  'V2s / T5940',
  'V2 PRO / T5921',
] as const;

function normalizeModel(model: string): string {
  const upper = model.toUpperCase();

  if (upper.includes('T5940') || upper.includes('V2S')) {
    return models[0];
  }

  if (upper.includes('T5921') || upper.includes('V2 PRO')) {
    return models[1];
  }

  return '';
}

export default function OcrConfirmModal({
  open,
  initialData,
  imageUrl,
  onCancel,
  onConfirm,
}: Props) {
  const [draft, setDraft] =
    useState<SunmiLabelData>(initialData);

  const [reviewed, setReviewed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    setDraft({
      ...initialData,
      model: normalizeModel(initialData.model),
    });
    setReviewed(false);
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;

    const oldOverflow = document.body.style.overflow;
    const oldFocus = document.activeElement;

    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = dialogRef.current?.querySelectorAll<
        HTMLElement
      >(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])',
      );

      if (!elements?.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
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

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);

      if (oldFocus instanceof HTMLElement) {
        oldFocus.focus();
      }
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isV2s = draft.model === 'V2s / T5940';
  const isV2Pro = draft.model === 'V2 PRO / T5921';

  const validImei1 = isValidImei(draft.imei);
  const validImei2 = isV2s
    ? isValidImei(draft.imei2)
    : !draft.imei2 || isValidImei(draft.imei2);

  const validSerial =
    /^[A-Z0-9-]{6,100}$/.test(draft.serialNumber);

  const validMeid =
    !draft.meid || /^[A-F0-9]{14}$/.test(draft.meid);

  const canConfirm =
    (isV2s || isV2Pro) &&
    validImei1 &&
    validImei2 &&
    validSerial &&
    validMeid &&
    (!draft.imei2 || draft.imei !== draft.imei2) &&
    reviewed;

  function update(
    field: keyof SunmiLabelData,
    value: string,
  ) {
    setReviewed(false);

    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function confirm() {
    if (!canConfirm) return;

    onConfirm({
      ...draft,
      brand: 'SUNMI',
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-confirm-title"
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2
              id="ocr-confirm-title"
              className="text-lg font-bold"
            >
              Confirmar etiqueta SUNMI
            </h2>
            <p className="text-xs text-slate-500">
              Compara los datos con la fotografía.
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Fotografía original
            </p>

            {/* La vista previa permite comparar
                caracteres antes de confirmar. */}
            <div className="overflow-hidden rounded-xl border bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Etiqueta del POS fotografiada"
                className="h-auto max-h-[50dvh] w-full object-contain"
              />
            </div>

            <p className="text-xs text-slate-500">
              Acerca la imagen con el zoom del navegador
              si necesitas comprobar los números.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="ocr-model" className="text-sm font-semibold">
                Modelo *
              </label>

              <select
                id="ocr-model"
                value={draft.model}
                onChange={(event) =>
                  update('model', event.target.value)
                }
                className="w-full rounded-xl border p-3 text-base"
              >
                <option value="">Selecciona el modelo</option>
                <option value="V2s / T5940">
                  SUNMI V2s / T5940
                </option>
                <option value="V2 PRO / T5921">
                  SUNMI V2 PRO / T5921
                </option>
              </select>
            </div>

            {(
              [
                {
                  key: 'serialNumber',
                  label: 'S/N *',
                  max: 100,
                },
                {
                  key: 'imei',
                  label: 'IMEI 1 *',
                  max: 15,
                },
                {
                  key: 'imei2',
                  label: isV2s
                    ? 'IMEI 2 *'
                    : 'IMEI 2 (opcional)',
                  max: 15,
                },
              ] as const
            ).map((item) => (
              <div key={item.key} className="space-y-1">
                <label
                  htmlFor={`ocr-${item.key}`}
                  className="text-sm font-semibold"
                >
                  {item.label}
                </label>

                <input
                  id={`ocr-${item.key}`}
                  value={draft[item.key]}
                  maxLength={item.max}
                  inputMode={
                    item.key === 'serialNumber'
                      ? 'text'
                      : 'numeric'
                  }
                  onChange={(event) => {
                    const value =
                      item.key === 'serialNumber'
                        ? event.target.value
                            .toUpperCase()
                            .replace(/\s/g, '')
                        : event.target.value.replace(/\D/g, '');

                    update(item.key, value);
                  }}
                  className="w-full rounded-xl border p-3 font-mono text-base"
                />
              </div>
            ))}

            {isV2Pro && (
              <div className="space-y-1">
                <label
                  htmlFor="ocr-meid"
                  className="text-sm font-semibold"
                >
                  MEID (opcional, aún no se guarda)
                </label>

                <input
                  id="ocr-meid"
                  value={draft.meid ?? ''}
                  maxLength={14}
                  onChange={(event) =>
                    update(
                      'meid',
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-F0-9]/g, ''),
                    )
                  }
                  className="w-full rounded-xl border p-3 font-mono text-base"
                />
              </div>
            )}

            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) =>
                  setReviewed(event.target.checked)
                }
                className="mt-1"
              />
              He comprobado el modelo y todos los
              identificadores contra la fotografía.
            </label>

            {!canConfirm && reviewed && (
              <p className="text-xs text-amber-700">
                Revisa el modelo, S/N y los IMEI.
                Los IMEI deben tener 15 dígitos válidos;
                V2s requiere ambos.
              </p>
            )}
          </div>
        </div>

        <footer className="flex gap-3 border-t p-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border px-4 py-3 font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!canConfirm}
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
