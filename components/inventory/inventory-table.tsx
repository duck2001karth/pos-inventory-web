
'use client';

import { useCallback, useState } from 'react';
import { Eye } from 'lucide-react';

import type { InventoryDevice } from '@/types/inventory';

import DeviceDetailModal from '@/components/inventory/modals/device-detail-modal';

type Props = {
  devices: InventoryDevice[];
};

const statusLabels: Record<string, string> = {
  IN_STOCK: 'En almacén',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En tránsito',
  IN_REPAIR: 'En reparación',
  RETIRED: 'Retirado',
  LOST: 'Extraviado',
};

const statusColors: Record<string, string> = {
  IN_STOCK: 'bg-emerald-50 text-emerald-700',
  ASSIGNED: 'bg-blue-50 text-blue-700',
  IN_TRANSIT: 'bg-amber-50 text-amber-700',
  IN_REPAIR: 'bg-orange-50 text-orange-700',
  RETIRED: 'bg-slate-100 text-slate-600',
  LOST: 'bg-red-50 text-red-700',
};

export default function InventoryTable({
  devices,
}: Props) {
  const [selectedDevice, setSelectedDevice] =
    useState<InventoryDevice | null>(null);

  const closeModal = useCallback(() => {
    setSelectedDevice(null);
  }, []);

  if (devices.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="font-medium text-slate-700">
          No se encontraron dispositivos.
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Prueba con otro código, S/N, IMEI o modelo.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th scope="col" className="p-4">
                Código interno
              </th>
              <th scope="col" className="p-4">
                S/N
              </th>
              <th scope="col" className="p-4">
                IMEI 1
              </th>
              <th scope="col" className="p-4">
                IMEI 2
              </th>
              <th scope="col" className="p-4">
                Marca
              </th>
              <th scope="col" className="p-4">
                Modelo
              </th>
              <th scope="col" className="p-4">
                Estado
              </th>
              <th scope="col" className="p-4">
                Ubicación
              </th>
              <th scope="col" className="p-4">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {devices.map((device) => (
              <tr
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className="cursor-pointer transition hover:bg-blue-50/50"
              >
                <td className="max-w-56 break-all p-4 font-medium">
                  {device.internalCode}
                </td>

                <td className="whitespace-nowrap p-4 font-mono text-xs">
                  {device.serialNumber ?? '—'}
                </td>

                <td className="whitespace-nowrap p-4 font-mono text-xs">
                  {device.imei ?? '—'}
                </td>

                <td className="whitespace-nowrap p-4 font-mono text-xs">
                  {device.imei2 ?? '—'}
                </td>

                <td className="whitespace-nowrap p-4 font-medium">
                  {device.model.brand}
                </td>

                <td className="whitespace-nowrap p-4">
                  {device.model.model}
                </td>

                <td className="p-4">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                      statusColors[device.status] ??
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {statusLabels[device.status] ??
                      device.status}
                  </span>
                </td>

                <td className="whitespace-nowrap p-4">
                  <span className="font-medium">
                    {device.currentLocation.name}
                  </span>

                  <span className="block text-xs text-slate-500">
                    {device.currentLocation.code}
                  </span>
                </td>

                <td className="p-4">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedDevice(device);
                    }}
                    aria-label={`Ver detalles del dispositivo ${device.serialNumber ?? device.internalCode}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Eye size={16} />
                    Ver detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeviceDetailModal
        device={selectedDevice}
        onClose={closeModal}
      />
    </>
  );
}
