
'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';

type ScannerPosProps = {
  onScan: (value: string) => void;
  label?: string;
};

export default function ScannerPos({
  onScan,
  label = 'código',
}: ScannerPosProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const startingRef = useRef(false);
  const detectedRef = useRef(false);
  const onScanRef = useRef(onScan);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;

    setActive(false);
    setLoading(false);
  }

  async function startCamera() {
    if (startingRef.current || controlsRef.current) return;

    startingRef.current = true;
    detectedRef.current = false;

    setError('');
    setLastCode('');
    setLoading(true);
    setActive(true);

    try {
      if (!window.isSecureContext) {
        throw new Error('Se necesita una conexión HTTPS.');
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'El navegador no permite utilizar la cámara.',
        );
      }

      const { BrowserMultiFormatOneDReader } =
        await import('@zxing/browser');

      const { BarcodeFormat, DecodeHintType } =
        await import('@zxing/library');

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.EAN_13,
      ]);

      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatOneDReader(
        hints,
        { delayBetweenScanAttempts: 120 },
      );

      if (!videoRef.current) {
        throw new Error('No se encontró el elemento de video.');
      }

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, _error, scannerControls) => {
          if (!result || detectedRef.current) return;

          const code = result.getText().trim();

          if (!code) return;

          detectedRef.current = true;
          setLastCode(code);

          scannerControls.stop();
          controlsRef.current = null;

          setActive(false);
          onScanRef.current(code);
        },
      );

      if (detectedRef.current) {
        controls.stop();
      } else {
        controlsRef.current = controls;
      }
    } catch (err) {
      console.error('Error de cámara:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar el escáner.',
      );

      setActive(false);
    } finally {
      startingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  return (
    <section className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          if (active) {
            stopCamera();
          } else {
            void startCamera();
          }
        }}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading
          ? 'Iniciando cámara...'
          : active
            ? 'Cerrar cámara'
            : `Escanear ${label}`}
      </button>

      <div
        className={`relative overflow-hidden rounded-xl bg-black ${
          active ? 'block' : 'hidden'
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-[4/3] w-full object-cover"
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-[90%] rounded-lg border-4 border-white shadow-lg" />
        </div>
      </div>

      {active && (
        <p className="text-center text-sm text-slate-600">
          Centra únicamente las barras de {label}.
          Mantén el teléfono firme mientras enfoca.
        </p>
      )}

      {lastCode && (
        <p role="status" className="break-all rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Código detectado: {lastCode}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
