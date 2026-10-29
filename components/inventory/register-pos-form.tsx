
'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ScanLine,
} from 'lucide-react';

import ScannerPos from '@/components/scanner/scanner-pos';
import ScannerOcr from '@/components/scanner/scanner-ocr';

import {
  isValidImei,
  type SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

type ScanField = 'imei1' | 'imei2' | 'sn';

type ExistingDevice = {
  internalCode: string;
  status: string;
  model: {
    brand: string;
    model: string;
  };
};

const labels: Record<ScanField, string> = {
  imei1: 'IMEI 1',
  imei2: 'IMEI 2',
  sn: 'S/N',
};

export default function RegisterPosForm() {
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
  const [reviewed, setReviewed] = useState(false);

  function invalidateVerification() {
    setExisting(null);
    setReviewed(false);
    setMessage('');
    setError('');
  }

  function handleScan(value: string) {
    const code = value.trim();

    invalidateVerification();

    if (target === 'imei1') {
      if (!/^\d{15}$/.test(code)) {
        setError('IMEI 1 debe tener 15 dígitos.');
        return;
      }

      setImei(code);
      setTarget('imei2');
    } else if (target === 'imei2') {
      if (!/^\d{15}$/.test(code)) {
        setError('IMEI 2 debe tener 15 dígitos.');
        return;
      }

      setImei2(code);
      setTarget('sn');
    } else {
      if (!code || code.length > 100) {
        setError('El S/N no es válido.');
        return;
      }

      setSerialNumber(code.toUpperCase());
    }

    setMessage(
      `${labels[target]} capturado. Revisa el valor.`,
    );
  }

  function handleOcr(data: SunmiLabelData) {
    invalidateVerification();

    // Solo sustituimos los campos que OCR reconoció.
    // Los demás conservan su contenido anterior.
    if (data.imei) setImei(data.imei);
    if (data.imei2) setImei2(data.imei2);

    if (data.serialNumber) {
      setSerialNumber(data.serialNumber);
    }

    setMessage(
      'Datos extraídos de la fotografía. ' +
      'Revisa cada identificador antes de registrar.',
    );
  }

  async function checkDuplicates() {
    setChecking(true);
    setError('');
    setExisting(null);

    try {
      const params = new URLSearchParams({
        serial: serialNumber.trim(),
        imei: imei.trim(),
        imei2: imei2.trim(),
      });

      const response = await fetch(
        `/api/devices?${params.toString()}`,
        {
          credentials: 'same-origin',
          cache: 'no-store',
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? 'Error al comprobar duplicados',
        );
      }

      if (result.exists) {
        setExisting(result.device);

        setError(
          'Uno de los identificadores ya está registrado.',
        );

        setReviewed(false);
      } else {
        setMessage(
          'No se encontraron duplicados. ' +
          'Puedes confirmar el registro.',
        );
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

  async function saveDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      saving ||
      checking ||
      existing ||
      !reviewed ||
      !valid
    ) {
      return;
    }

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
          imei: imei.trim(),
          imei2: imei2.trim(),
          serialNumber: serialNumber.trim().toUpperCase(),
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
        `POS registrado correctamente: ${result.device.internalCode}`,
      );

      setImei('');
      setImei2('');
      setSerialNumber('');
      setNotes('');
      setTarget('imei1');
      setReviewed(false);
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
    serialNumber.trim().length >= 6 &&
    brand.trim().length > 0 &&
    model.trim().length > 0;

  const imei1LuhnValid =
    !imei || isValidImei(imei);

  const imei2LuhnValid =
    !imei2 || isValidImei(imei2);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <Link
            href="/inventario"
            className="text-sm font-medium text-blue-600"
          >
            ← Volver al inventario
          </Link>

          <h1 className="mt-4 text-2xl font-bold">
            Registrar dispositivo POS
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Captura los identificadores del fabricante
            mediante fotografía, códigos de barras
            o ingreso manual.
          </p>
        </header>

        <form
          onSubmit={saveDevice}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              1. Fotografiar etiqueta completa
            </h2>

            <ScannerOcr onExtract={handleOcr} />
          </section>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">
              O escanea individualmente
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ScanLine size={21} />
              2. Escaneo de códigos de barras
            </h2>

            {(
              [
                ['imei1', 'IMEI 1', imei],
                ['imei2', 'IMEI 2', imei2],
                ['sn', 'S/N', serialNumber],
              ] as const
            ).map(([field, label, value]) => (
              <button
                key={field}
                type="button"
                onClick={() => setTarget(field)}
                className={`w-full rounded-xl border p-3 text-left ${
                  target === field
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="font-semibold">{label}</span>

                  <span className="text-xs text-slate-600">
                    {value ? 'Capturado' : 'Pendiente'}
                  </span>
                </span>

                <span className="mt-1 block break-all text-sm text-slate-500">
                  {value || 'Seleccionar para escanear'}
                </span>
              </button>
            ))}

            <ScannerPos
              label={labels[target]}
              onScan={handleScan}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              3. Revisar identificadores
            </h2>

            <div className="space-y-2">
              <label
                htmlFor="imei1"
                className="block text-sm font-medium"
              >
                IMEI 1 *
              </label>

              <input
                id="imei1"
                required
                inputMode="numeric"
                maxLength={15}
                value={imei}
                onChange={(e) => {
                  invalidateVerification();
                  setImei(e.target.value);
                }}
                className="w-full rounded-xl border p-3"
              />

              {imei &&
                !imei1LuhnValid && (
                  <p className="text-xs text-amber-700">
                    Verifica IMEI 1: no supera la comprobación Luhn.
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="imei2"
                className="block text-sm font-medium"
              >
                IMEI 2 *
              </label>

              <input
                id="imei2"
                required
                inputMode="numeric"
                maxLength={15}
                value={imei2}
                onChange={(e) => {
                  invalidateVerification();
                  setImei2(e.target.value);
                }}
                className="w-full rounded-xl border p-3"
              />

              {imei2 &&
                !imei2LuhnValid && (
                  <p className="text-xs text-amber-700">
                    Verifica IMEI 2: no supera la comprobación Luhn.
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="serialNumber"
                className="block text-sm font-medium"
              >
                S/N — Número de serie *
              </label>

              <input
                id="serialNumber"
                required
                maxLength={100}
                value={serialNumber}
                onChange={(e) => {
                  invalidateVerification();
                  setSerialNumber(
                    e.target.value.toUpperCase(),
                  );
                }}
                className="w-full rounded-xl border p-3"
              />
            </div>

            {imei && imei2 && imei === imei2 && (
              <p className="text-sm text-red-600">
                IMEI 1 e IMEI 2 deben ser diferentes.
              </p>
            )}

            <button
              type="button"
              disabled={!valid || checking}
              onClick={() => void checkDuplicates()}
              className="w-full rounded-xl border border-blue-600 p-3 font-semibold text-blue-700 disabled:opacity-50"
            >
              {checking
                ? 'Comprobando...'
                : 'Comprobar duplicados'}
            </button>

            {existing && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">
                  Dispositivo ya registrado
                </p>
                <p>Código: {existing.internalCode}</p>
                <p>
                  Modelo: {existing.model.brand}{' '}
                  {existing.model.model}
                </p>
                <p>Estado: {existing.status}</p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              4. Información del dispositivo
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="brand"
                  className="block text-sm font-medium"
                >
                  Marca *
                </label>

                <input
                  id="brand"
                  required
                  maxLength={100}
                  value={brand}
                  onChange={(e) => {
                    invalidateVerification();
                    setBrand(e.target.value);
                  }}
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="model"
                  className="block text-sm font-medium"
                >
                  Modelo *
                </label>

                <input
                  id="model"
                  required
                  maxLength={100}
                  value={model}
                  onChange={(e) => {
                    invalidateVerification();
                    setModel(e.target.value);
                  }}
                  className="w-full rounded-xl border p-3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="block text-sm font-medium"
              >
                Observaciones
              </label>

              <textarea
                id="notes"
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              Almacén inicial: ALM-001
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                className="mt-1"
              />

              <span>
                He comprobado IMEI 1, IMEI 2 y S/N
                con los valores impresos en el dispositivo.
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertTriangle size={19} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div
                role="status"
                className="flex gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800"
              >
                <CheckCircle2 size={19} />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                !valid ||
                !reviewed ||
                Boolean(existing) ||
                checking ||
                saving
              }
              className="w-full rounded-xl bg-blue-600 px-4 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Registrando dispositivo...'
                : 'Registrar POS'}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
