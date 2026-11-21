'use client';

import { CheckCircle2, MessageSquareText, ShieldCheck } from 'lucide-react';
import type { BatchItem } from './batch-types';
import { validateBatchItem } from './batch-validation';

type EditableField = 'model' | 'serialNumber' | 'imei' | 'imei2' | 'notes';

type Props = {
  item: BatchItem | undefined;
  disabled: boolean;
  onUpdate: (field: EditableField, value: string) => void;
  onReviewed: (checked: boolean) => void;
};

export default function OcrBatchReview({
  item,
  disabled,
  onUpdate,
  onReviewed,
}: Props) {
  if (!item) {
    return (
      <section className="app-panel p-6 text-sm text-[var(--app-muted)]">
        Selecciona una fotografía para revisar los datos y registrar sus observaciones.
      </section>
    );
  }

  const locked = disabled || item.status === 'saved';
  const invalid = validateBatchItem(item);
  const inputClass = 'app-field w-full font-mono text-sm';

  return (
    <section className="app-panel min-w-0 space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="break-words text-lg font-bold">Revisión de {item.name}</h2>
        <p className="break-words text-sm text-[var(--app-muted)]">
          {item.message || 'Comprueba cada identificador con la fotografía.'}
        </p>
      </div>

      {/* Campo destacado: las observaciones son independientes por POS. */}
      <div className="space-y-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-hover)] p-3 sm:p-4">
        <label htmlFor={`batch-notes-${item.id}`} className="flex items-center gap-2 text-sm font-bold">
          <MessageSquareText size={19} className="text-[var(--app-accent)]" />
          Observaciones de este dispositivo (opcional)
        </label>
        <textarea
          id={`batch-notes-${item.id}`}
          className="app-field min-h-28 w-full resize-y text-base"
          rows={4}
          maxLength={1000}
          disabled={locked}
          value={item.notes}
          onChange={(event) => onUpdate('notes', event.target.value)}
          placeholder="Ej.: Pantalla rayada, sin batería, accesorios incompletos..."
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--app-muted)]">
          <span>
            {locked && item.status === 'saved'
              ? 'Observación guardada con el POS.'
              : 'Se guardará junto con este POS. No modifica su comprobación de duplicados.'}
          </span>
          <span className="tabular-nums">{item.notes.length}/1000</span>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold">Fotografía original</p>
          <div className="max-h-[52dvh] overflow-auto rounded-xl bg-black p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.preview}
              alt={`Etiqueta ${item.name}`}
              className="mx-auto h-auto max-h-[50dvh] max-w-full object-contain"
            />
          </div>
          <p className="text-xs text-[var(--app-muted)]">
            Amplía la fotografía para comprobar todos los dígitos.
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <label className="block space-y-1 text-sm font-semibold">
            Modelo *
            <select
              className={inputClass}
              disabled={locked}
              value={item.data.model}
              onChange={(event) => onUpdate('model', event.target.value)}
            >
              <option value="">Selecciona el modelo</option>
              <option value="V2s / T5940">V2s / T5940</option>
              <option value="V2 PRO / T5921">V2 PRO / T5921</option>
            </select>
          </label>

          {([
            { key: 'serialNumber', label: 'Número de serie *', numeric: false },
            { key: 'imei', label: 'IMEI 1 *', numeric: true },
            { key: 'imei2', label: 'IMEI 2 (obligatorio en V2s)', numeric: true },
          ] as const).map((field) => (
            <label key={field.key} className="block space-y-1 text-sm font-semibold">
              {field.label}
              <input
                className={inputClass}
                disabled={locked}
                inputMode={field.numeric ? 'numeric' : 'text'}
                value={item.data[field.key]}
                maxLength={field.numeric ? 15 : 100}
                onChange={(event) => onUpdate(
                  field.key,
                  field.numeric
                    ? event.target.value.replace(/\D/g, '').slice(0, 15)
                    : event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 100),
                )}
              />
            </label>
          ))}

          {invalid && (
            <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {invalid}
            </p>
          )}
          {!invalid && item.status === 'ready' && (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={18} /> Identificadores disponibles en la última comprobación.
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--app-border)] p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={item.reviewed}
              disabled={locked || Boolean(invalid) || item.status === 'pending' || item.status === 'processing'}
              onChange={(event) => onReviewed(event.target.checked)}
            />
            <span className="flex-1">
              <span className="flex items-center gap-1 font-semibold">
                <ShieldCheck size={16} /> Confirmación del administrador
              </span>
              He comprobado los identificadores y las observaciones de este dispositivo.
            </span>
          </label>
          {item.status === 'saved' && (
            <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">
              Registrado: {item.internalCode}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
