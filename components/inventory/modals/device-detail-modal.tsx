
'use client';

import { useEffect, useRef } from 'react';
import {
  CalendarDays,
  Hash,
  MapPin,
  Smartphone,
  X,
} from 'lucide-react';

import type { InventoryDevice } from '@/types/inventory';

type Props = {
  device: InventoryDevice | null;
  onClose: () => void;
};

const statusLabels: Record<string, string> = {
  IN_STOCK: 'En almacén',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En tránsito',
  IN_REPAIR: 'En reparación',
  RETIRED: 'Retirado',
  LOST: 'Extraviado',
};

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="break-all text-sm font-medium text-slate-900">
        {value || 'Sin registrar'}
      </dd>
    </div>
  );
}

export default function DeviceDetailModal({
  device,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!device) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;

    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }

      // Mantener el foco dentro del modal.
      if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [device, onClose]);

  if (!device) return null;

  const registeredAt = new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(device.createdAt));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-detail-title"
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Smartphone size={24} />
            </div>

            <div className="min-w-0">
              <h2
                id="device-detail-title"
                className="text-lg font-bold"
              >
                Detalles del dispositivo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {device.model.brand} {device.model.model}
              </p>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalles"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto p-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Código interno
            </p>
            <p className="mt-2 break-all font-mono text-sm font-semibold">
              {device.internalCode}
            </p>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash size={19} className="text-blue-600" />
              <h3 className="font-semibold">
                Identificadores del fabricante
              </h3>
            </div>

            <dl className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
              <Detail
                label="S/N"
                value={device.serialNumber}
              />
              <Detail
                label="IMEI 1"
                value={device.imei}
              />
              <Detail
                label="IMEI 2"
                value={device.imei2}
              />
              <Detail
                label="Marca"
                value={device.model.brand}
              />
              <Detail
                label="Modelo"
                value={device.model.model}
              />
            </dl>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin size={19} className="text-blue-600" />
              <h3 className="font-semibold">
                Inventario y ubicación
              </h3>
            </div>

            <dl className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
              <Detail
                label="Estado"
                value={
                  statusLabels[device.status] ?? device.status
                }
              />
              <Detail
                label="Almacén"
                value={device.currentLocation.name}
              />
              <Detail
                label="Código de ubicación"
                value={device.currentLocation.code}
              />
            </dl>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={19}
                className="text-blue-600"
              />
              <h3 className="font-semibold">
                Información adicional
              </h3>
            </div>

            <dl className="space-y-4 rounded-xl border border-slate-200 p-4">
              <Detail
                label="Fecha de registro"
                value={registeredAt}
              />
              <Detail
                label="Observaciones"
                value={device.notes}
              />
            </dl>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Cerrar detalles
          </button>
        </footer>
      </div>
    </div>
  );
}
