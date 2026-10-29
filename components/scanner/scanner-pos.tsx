
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

type Props = {
  onScan: (value: string) => void;
  label?: string;
};

export default function ScannerPos({
  onScan,
  label = 'código',
}: Props) {
  const readerId = `reader-${useId().replace(/:/g, '')}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const detectedRef = useRef(false);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  async function stopCamera() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    const scanner = scannerRef.current;
    scannerRef.current = null;

    try {
      if (scanner) {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      }
    } catch (err) {
      console.error('Error al cerrar escáner:', err);
    } finally {
      setActive(false);
      stoppingRef.current = false;
    }
  }

  async function startCamera() {
    if (startingRef.current || scannerRef.current) return;

    startingRef.current = true;
    detectedRef.current = false;
    setLoading(true);
    setError('');

    try {
      if (!window.isSecureContext) {
        throw new Error('El escáner necesita HTTPS.');
      }

      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } = await import('html5-qrcode');

      const scanner = new Html5Qrcode(readerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (width, height) => ({
            width: Math.max(
              1,
              Math.floor(Math.min(width * 0.95, 450)),
            ),
            height: Math.max(
              1,
              Math.floor(Math.min(height * 0.3, 140)),
            ),
          }),
          disableFlip: true,
        },
        (decodedText) => {
          const value = decodedText.trim();

          if (!value || detectedRef.current) return;

          detectedRef.current = true;

          onScanRef.current(value);
          void stopCamera();
        },
        () => {
          // No detectar un código en cada fotograma es normal.
        },
      );

      setActive(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err);

      setError(`No se pudo iniciar la cámara: ${message}`);
      await stopCamera();
    } finally {
      startingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void (async () => {
          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
            scanner.clear();
          } catch {
            // Limpieza al desmontar el componente.
          }
        })();
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          if (active) {
            void stopCamera();
          } else {
            void startCamera();
          }
        }}
        disabled={loading || stoppingRef.current}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading
          ? 'Abriendo cámara...'
          : active
            ? 'Cerrar cámara'
            : `Escanear ${label}`}
      </button>

      <div
        id={readerId}
        className={`overflow-hidden rounded-lg border bg-black ${
          active || loading ? 'block' : 'hidden'
        }`}
      />

      {active && (
        <p className="text-center text-sm text-slate-600">
          Acerca el código de barras, mantenlo horizontal
          y enfoca solo las barras de {label}.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
