
'use client';

import { useEffect, useRef, useState } from 'react';

type ScannerPosProps = {
  onScan: (code: string) => void;
};

export default function ScannerPos({
  onScan,
}: ScannerPosProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let scanner: import('html5-qrcode').Html5QrcodeScanner
      | undefined;

    async function startScanner() {
      try {
        const {
          Html5QrcodeScanner,
          Html5QrcodeSupportedFormats,
        } = await import('html5-qrcode');

        if (cancelled) return;

        scanner = new Html5QrcodeScanner(
          'pos-reader',
          {
            fps: 10,
            qrbox: { width: 220, height: 160 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
            ],
          },
          false,
        );

        scanner.render(
          (decodedText) => {
            if (cancelled) return;

            const code = decodedText.trim();

            if (!code) return;

            cancelled = true;
            onScanRef.current(code);
            setActive(false);
          },
          () => {
            // No mostramos errores por cada fotograma
            // en el que no se detecte un código.
          },
        );
      } catch {
        if (!cancelled) {
          setError('No se pudo iniciar el escáner.');
          setActive(false);
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;

      if (scanner) {
        void scanner.clear().catch(() => {});
      }
    };
  }, [active]);

  return (
    <section className="space-y-4">
      {!active ? (
        <button
          type="button"
          onClick={() => {
            setError('');
            setActive(true);
          }}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Abrir cámara / Escanear QR o barras
        </button>
      ) : (
        <>
          <div
            id="pos-reader"
            className="overflow-hidden rounded-lg border bg-white"
          />

          <button
            type="button"
            onClick={() => setActive(false)}
            className="w-full rounded-lg border px-4 py-3"
          >
            Cerrar escáner
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
