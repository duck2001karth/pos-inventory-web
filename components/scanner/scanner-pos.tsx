
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

type ScannerPosProps = {
  onScan: (code: string) => void;
};

export default function ScannerPos({
  onScan,
}: ScannerPosProps) {
  const id = useId().replace(/:/g, '');
  const readerId = `pos-reader-${id}`;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const onScanRef = useRef(onScan);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  async function stopCamera() {
    const scanner = scannerRef.current;

    if (!scanner) {
      setActive(false);
      return;
    }

    scannerRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }

      scanner.clear();
    } catch (err) {
      console.error('Error al cerrar cámara:', err);
    } finally {
      setActive(false);
    }
  }

  async function startCamera() {
    if (busyRef.current || scannerRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setError('');

    try {
      if (!window.isSecureContext) {
        throw new Error(
          'La página debe abrirse mediante HTTPS.',
        );
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Este navegador no permite acceder a la cámara.',
        );
      }

      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } = await import('html5-qrcode');

      const scanner = new Html5Qrcode(
        readerId,
        {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        },
      );

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => ({
            width: Math.min(width * 0.9, 320),
            height: Math.min(height * 0.45, 150),
          }),
          aspectRatio: 1.777778,
          disableFlip: true,
        },
        (decodedText) => {
          const code = decodedText.trim();

          if (!code || busyRef.current) return;

          busyRef.current = true;
          onScanRef.current(code);

          void stopCamera().finally(() => {
            busyRef.current = false;
          });
        },
        () => {
          // Es normal no reconocer un código en
          // cada fotograma mientras se enfoca.
        },
      );

      setActive(true);
    } catch (err) {
      const detail =
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err);

      console.error('Error de cámara:', err);

      setError(
        `No se pudo abrir la cámara. ${detail}`,
      );

      await stopCamera();
    } finally {
      busyRef.current = false;
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
            // Limpieza al salir de la página.
          }
        })();
      }
    };
  }, []);

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => {
          if (active) {
            void stopCamera();
          } else {
            void startCamera();
          }
        }}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading
          ? 'Iniciando cámara...'
          : active
            ? 'Cerrar cámara'
            : 'Abrir cámara y escanear POS'}
      </button>

      <div
        id={readerId}
        className={`overflow-hidden rounded-lg border bg-black ${
          active || loading ? 'block' : 'hidden'
        }`}
      />

      {active && (
        <p className="text-center text-sm text-slate-600">
          Enfoca el código de barras SN del dispositivo.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
    </section>
  );
}
