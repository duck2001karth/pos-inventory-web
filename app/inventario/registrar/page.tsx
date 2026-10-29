
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import ScannerPos from '@/components/scanner/scanner-pos';
import ScannerImagen from '@/components/scanner/scanner-imagen';

type ScanField = 'imei1' | 'imei2' | 'sn';

type ExistingDevice = {
  internalCode: string;
  serialNumber: string | null;
  imei: string | null;
  imei2: string | null;
  status: string;
  model: {
    brand: string;
    model: string;
  };
};

const fieldLabels: Record<ScanField, string> = {
  imei1: 'IMEI 1',
  imei2: 'IMEI 2',
  sn: 'S/N',
};

export default function RegistrarPosPage() {
  const router = useRouter();

  const [target, setTarget] = useState<ScanField>('imei1');
  const [imei, setImei] = useState('');
  const [imei2, setImei2] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  const [brand, setBrand] = useState('SUNMI');
  const [model, setModel] = useState('V2s / T5940');
  const [notes, setNotes] = useState('');

  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] =
    useState<ExistingDevice | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fieldsRef = useRef({ imei, imei2, serialNumber });
  fieldsRef.current = { imei, imei2, serialNumber };

  function handleScan(value: string) {
    const code = value.trim();

    setError('');
    setMessage('');
    setExisting(null);

    if (target === 'imei1') {
      if (!/^\d{15}$/.test(code)) {
        setError('IMEI 1 debe contener 15 dígitos.');
        return;
      }
      setImei(code);
      setTarget('imei2');
    } else if (target === 'imei2') {
      if (!/^\d{15}$/.test(code)) {
        setError('IMEI 2 debe contener 15 dígitos.');
        return;
      }
      setImei2(code);
      setTarget('sn');
    } else {
      if (!code || code.length > 100) {
        setError('El número de serie no es válido.');
        return;
      }
      setSerialNumber(code);
    }

    setMessage(`${fieldLabels[target]} capturado correctamente.`);
  }

  async function checkDuplicates() {
    setChecking(true);
    setError('');
    setExisting(null);
    setMessage('');

    try {
      const params = new URLSearchParams({
        serial: serialNumber.trim(),
        imei: imei.trim(),
        imei2: imei2.trim(),
      });

      const response = await fetch(
        `/api/devices?${params.toString()}`,
        { cache: 'no-store' },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? 'No se pudo comprobar el equipo',
        );
      }

      if (result.exists) {
        setExisting(result.device);
        setError('Este POS ya existe en el inventario.');
      } else {
        setMessage('Los tres identificadores están disponibles.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexión',
      );
    } finally {
      setChecking(false);
    }
  }

  async function saveDevice(event: React.FormEvent) {
    event.preventDefault();
    if (checking || saving || existing) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          serialNumber: serialNumber.trim(),
          imei: imei.trim(),
          imei2: imei2.trim(),
          brand: brand.trim(),
          model: model.trim(),
          notes: notes.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? 'No se pudo registrar el POS',
        );
      }

      setMessage(
        `Dispositivo registrado: ${result.device.internalCode}`,
      );

      setImei('');
      setImei2('');
      setSerialNumber('');
      setNotes('');
      setTarget('imei1');
      setExisting(null);

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexión',
      );
    } finally {
      setSaving(false);
    }
  }

  const valid =
    /^\d{15}$/.test(imei) &&
    /^\d{15}$/.test(imei2) &&
    imei !== imei2 &&
    serialNumber.trim().length > 0 &&
    brand.trim().length > 0 &&
    model.trim().length > 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <header>
          <Link
            href="/inventario"
            className="text-sm text-blue-600"
          >
            ← Volver al inventario
          </Link>

          <h1 className="mt-4 text-2xl font-bold">
            Registrar dispositivo POS
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Escanea IMEI 1, IMEI 2 y S/N de la etiqueta
            del fabricante.
          </p>
        </header>

        <form
          onSubmit={saveDevice}
          className="space-y-5 rounded-xl border bg-white p-5 shadow-sm"
        >
          <div className="space-y-3">
            <h2 className="font-semibold">
              1. Selecciona el código para escanear
            </h2>

            {(
              [
                ['imei1', 'IMEI 1', imei],
                ['imei2', 'IMEI 2', imei2],
                ['sn', 'S/N', serialNumber],
              ] as const
            ).map(([field, label, value]) => (
              <button
                type="button"
                key={field}
                onClick={() => setTarget(field)}
                className={`w-full rounded-lg border p-3 text-left ${
                  target === field
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="font-semibold">{label}</span>
                  <span className="text-sm">
                    {value ? '✓ Capturado' : 'Pendiente'}
                  </span>
                </span>
                <span className="mt-1 block break-all text-sm text-slate-600">
                  {value || 'Pulsa para seleccionar'}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3 rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium">
              Código seleccionado: {fieldLabels[target]}
            </p>

            <ScannerPos
              onScan={handleScan}
              label={fieldLabels[target]}
            />

            <ScannerImagen onScan={handleScan} />
          </div>

          <h2 className="font-semibold">
            2. Verifica los identificadores
          </h2>

          <div className="space-y-2">
            <label htmlFor="imei1" className="text-sm font-medium">
              IMEI 1 *
            </label>
            <input
              id="imei1"
              inputMode="numeric"
              maxLength={15}
              required
              value={imei}
              onChange={(e) => {
                setImei(e.target.value);
                setExisting(null);
              }}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="imei2" className="text-sm font-medium">
              IMEI 2 *
            </label>
            <input
              id="imei2"
              inputMode="numeric"
              maxLength={15}
              required
              value={imei2}
              onChange={(e) => {
                setImei2(e.target.value);
                setExisting(null);
              }}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="serial" className="text-sm font-medium">
              S/N *
            </label>
            <input
              id="serial"
              required
              maxLength={100}
              value={serialNumber}
              onChange={(e) => {
                setSerialNumber(e.target.value);
                setExisting(null);
              }}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <button
            type="button"
            disabled={!valid || checking}
            onClick={() => void checkDuplicates()}
            className="w-full rounded-lg border border-blue-600 p-3 font-medium text-blue-700 disabled:opacity-50"
          >
            {checking
              ? 'Comprobando...'
              : 'Comprobar si el POS ya está registrado'}
          </button>

          {existing && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                Este dispositivo ya existe.
              </p>
              <p>Código: {existing.internalCode}</p>
              <p>
                Modelo: {existing.model.brand}{' '}
                {existing.model.model}
              </p>
              <p>Estado: {existing.status}</p>
            </div>
          )}

          <h2 className="font-semibold">
            3. Información del dispositivo
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="brand" className="text-sm font-medium">
                Marca *
              </label>
              <input
                id="brand"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="model" className="text-sm font-medium">
                Modelo *
              </label>
              <input
                id="model"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border p-3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Observaciones
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            Ubicación inicial: ALM-001
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="text-sm text-green-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={!valid || checking || saving || !!existing}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Registrar POS'}
          </button>
        </form>
      </div>
    </main>
  );
}
