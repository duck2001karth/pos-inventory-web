
'use client';

import { useId, useRef, useState } from 'react';

type Props = {
  onScan: (code: string) => void;
};

export default function ScannerImagen({ onScan }: Props) {
  const reactId = useId();
  const scannerId = `image-scanner-${reactId.replace(/:/g, '')}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleImage(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo seleccionado no es una imagen.');
      }

      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } = await import('html5-qrcode');

      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
      });

      try {
        const result = await scanner.scanFile(file, true);
        const code = result.trim();

        if (!code) {
          throw new Error('No se obtuvo ningún identificador.');
        }

        setSuccess(`Código detectado: ${code}`);
        onScan(code);
      } finally {
        try {
          scanner.clear();
        } catch {
          // El lector puede haberse limpiado previamente.
        }
      }
    } catch (err) {
      console.error('Error al leer imagen POS:', err);

      setError(
        'No se pudo reconocer el código de barras. ' +
        'Recorta únicamente el SN, endereza la imagen ' +
        'y vuelve a intentarlo. Si continúa fallando, ' +
        'puedes escribir el número de serie manualmente.',
      );
    } finally {
      setLoading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <section className="space-y-3">
      <label
        htmlFor={`${scannerId}-file`}
        className="block cursor-pointer rounded-lg border-2 border-blue-600 px-4 py-3 text-center font-semibold text-blue-700"
      >
        {loading
          ? 'Leyendo código...'
          : 'Subir foto del código SN'}
      </label>

      <input
        id={`${scannerId}-file`}
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={loading}
        onChange={handleImage}
        className="sr-only"
      />

      <div
        id={scannerId}
        className="max-w-full overflow-hidden rounded-lg"
      />

      {success && (
        <p role="status" className="text-sm text-green-700">
          {success}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
