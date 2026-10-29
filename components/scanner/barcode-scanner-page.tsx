
'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCopy,
  RotateCcw,
} from 'lucide-react';

import ScannerPos from '@/components/scanner/scanner-pos';

type Field = 'imei1' | 'imei2' | 'sn';

const labels: Record<Field, string> = {
  imei1: 'IMEI 1',
  imei2: 'IMEI 2',
  sn: 'S/N',
};

export default function BarcodeScannerPage() {
  const [field, setField] = useState<Field>('imei1');

  const [values, setValues] = useState({
    imei1: '',
    imei2: '',
    sn: '',
  });

  const [message, setMessage] = useState('');

  function handleScan(raw: string) {
    const code = raw.trim();

    if (
      field !== 'sn' &&
      !/^\d{15}$/.test(code)
    ) {
      setMessage(
        `${labels[field]} necesita 15 dígitos. ` +
        `Se leyó: ${code}`,
      );
      return;
    }

    if (!code) return;

    setValues((previous) => ({
      ...previous,
      [field]: code,
    }));

    setMessage(`${labels[field]} detectado correctamente.`);

    if (field === 'imei1') {
      setField('imei2');
    } else if (field === 'imei2') {
      setField('sn');
    }
  }

  const combined = [
    `IMEI 1: ${values.imei1}`,
    `IMEI 2: ${values.imei2}`,
    `S/N: ${values.sn}`,
  ].join('\n');

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-blue-600">
            HERRAMIENTAS
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Lector de barras / QR
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Escanea IMEI 1, IMEI 2 y S/N por separado.
            Esta pantalla no registra dispositivos.
          </p>
        </header>

        <section className="space-y-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-semibold">
            1. Selecciona el identificador
          </h2>

          <div className="space-y-3">
            {(
              ['imei1', 'imei2', 'sn'] as const
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setField(item);
                  setMessage('');
                }}
                className={`w-full rounded-xl border p-4 text-left ${
                  field === item
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {labels[item]}
                  </span>

                  {values[item] && (
                    <CheckCircle2
                      size={20}
                      className="text-green-600"
                    />
                  )}
                </div>

                <p className="mt-2 break-all text-sm text-slate-500">
                  {values[item] || 'Pendiente de lectura'}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-3 border-t pt-5">
            <h2 className="font-semibold">
              2. Capturar {labels[field]}
            </h2>

            <ScannerPos
              label={labels[field]}
              onScan={handleScan}
            />

            {message && (
              <p
                role="status"
                className="rounded-lg bg-slate-100 p-3 text-sm"
              >
                {message}
              </p>
            )}
          </div>

          <div className="space-y-3 border-t pt-5">
            <h2 className="font-semibold">
              3. Resultados
            </h2>

            {(
              ['imei1', 'imei2', 'sn'] as const
            ).map((item) => (
              <div key={item} className="space-y-1">
                <label
                  htmlFor={`barcode-${item}`}
                  className="text-sm font-medium"
                >
                  {labels[item]}
                </label>

                <input
                  id={`barcode-${item}`}
                  value={values[item]}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      [item]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard.writeText(combined)
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold text-white"
              >
                <ClipboardCopy size={18} />
                Copiar resultados
              </button>

              <button
                type="button"
                onClick={() => {
                  setValues({
                    imei1: '',
                    imei2: '',
                    sn: '',
                  });
                  setField('imei1');
                  setMessage('');
                }}
                className="flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold"
              >
                <RotateCcw size={18} />
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <Link
          href="/inventario/registrar"
          className="block rounded-xl border border-blue-600 p-3 text-center font-semibold text-blue-700"
        >
          Ir al registro por fotografía OCR
        </Link>
      </div>
    </main>
  );
}
