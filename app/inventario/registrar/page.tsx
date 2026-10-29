
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ScannerPos from '@/components/scanner/scanner-pos';
import ScannerImagen from '@/components/scanner/scanner-imagen';

type ExistingDevice = {
  internalCode: string;
  status: string;
  model: {
    brand: string;
    model: string;
  };
  currentLocation: {
    name: string;
  };
};

export default function RegistrarPosPage() {
  const router = useRouter();

  const [serialNumber, setSerialNumber] = useState('');
  const [imei, setImei] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [notes, setNotes] = useState('');

  const [existing, setExisting] =
    useState<ExistingDevice | null>(null);

  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function checkDuplicate(code: string) {
    const serial = code.trim();
    setExisting(null);
    setMessage('');
    setError('');

    if (!serial) return;

    setChecking(true);

    try {
      const response = await fetch(
        `/api/devices?serial=${encodeURIComponent(serial)}`,
        { cache: 'no-store' },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? 'No se pudo verificar el código',
        );
      }

      if (data.exists) {
        setExisting(data.device);
      } else {
        setMessage(
          'Serie disponible. Completa los datos del POS.',
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

  async function saveDevice(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (existing || checking || saving) return;

    setSaving(true);

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          serialNumber: serialNumber.trim(),
          imei: imei.trim(),
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
        `POS registrado: ${result.device.internalCode}`,
      );

      setSerialNumber('');
      setImei('');
      setBrand('');
      setModel('');
      setNotes('');
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

          <h1 className="mt-3 text-2xl font-bold">
            Registrar dispositivo POS
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Escanea la etiqueta original del fabricante.
            El código se utilizará como número de serie.
          </p>
        </header>

        <form
          onSubmit={saveDevice}
          className="space-y-5 rounded-xl border bg-white p-5 shadow-sm"
        >
          <ScannerPos
            onScan={(code) => {
                setSerialNumber(code);
                void checkDuplicate(code);
            }}
            />

            <ScannerImagen
            onScan={(code) => {
                setSerialNumber(code);
                void checkDuplicate(code);
            }}
            />

          <div className="space-y-2">
            <label
              htmlFor="serialNumber"
              className="block text-sm font-medium"
            >
              Número de serie del fabricante *
            </label>

            <input
              id="serialNumber"
              required
              maxLength={100}
              value={serialNumber}
              onChange={(event) => {
                setSerialNumber(event.target.value);
                setExisting(null);
                setMessage('');
              }}
              onBlur={() => {
                if (serialNumber.trim()) {
                  void checkDuplicate(serialNumber);
                }
              }}
              placeholder="Escanea o escribe el número de serie"
              className="w-full rounded-lg border p-3"
            />
          </div>

          {checking && (
            <p className="text-sm text-slate-500">
              Buscando dispositivo...
            </p>
          )}

          {existing && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                Este dispositivo ya está registrado.
              </p>
              <p>Código: {existing.internalCode}</p>
              <p>
                Modelo: {existing.model.brand}{' '}
                {existing.model.model}
              </p>
              <p>Estado: {existing.status}</p>
              <p>
                Ubicación: {existing.currentLocation.name}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="imei"
              className="block text-sm font-medium"
            >
              IMEI (opcional, 15 dígitos)
            </label>

            <input
              id="imei"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              inputMode="numeric"
              maxLength={15}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                onChange={(e) => setBrand(e.target.value)}
                placeholder="PAX"
                className="w-full rounded-lg border p-3"
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
                onChange={(e) => setModel(e.target.value)}
                placeholder="A920"
                className="w-full rounded-lg border p-3"
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            Ubicación inicial: ALM-001 — Almacén principal
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
            disabled={
              saving ||
              checking ||
              Boolean(existing) ||
              !serialNumber.trim()
            }
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Registrando...' : 'Registrar POS'}
          </button>
        </form>
      </div>
    </main>
  );
}
