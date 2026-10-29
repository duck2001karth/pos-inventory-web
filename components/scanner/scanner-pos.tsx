
'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';

type Props = {
  onScan: (code: string) => void;
  label?: string;
};

export default function ScannerPos({
  onScan,
  label = 'código',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onScanRef = useRef(onScan);

  const startingRef = useRef(false);
  const detectedRef = useRef(false);
  const mountedRef = useRef(true);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraInfo, setCameraInfo] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (mountedRef.current) {
      setActive(false);
      setLoading(false);
    }
  }

  async function startCamera() {
    if (startingRef.current || streamRef.current) return;

    startingRef.current = true;
    detectedRef.current = false;
    setLoading(true);
    setActive(true);
    setError('');
    setCameraInfo('');

    try {
      if (!window.isSecureContext) {
        throw new Error('La cámara necesita HTTPS.');
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Este navegador no admite acceso a la cámara.',
        );
      }

      // Solicitar la cámara antes de cargar ZXing.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error('No se encontró el visor de video.');
      }

      // Importante para Safari en iPhone.
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;

      await video.play();

      const videoTrack = stream.getVideoTracks()[0];

      if (!videoTrack || videoTrack.readyState !== 'live') {
        throw new Error('La cámara no está transmitiendo video.');
      }

      const settings = videoTrack.getSettings();

      if (mountedRef.current) {
        setCameraInfo(
          `Cámara activa: ${settings.width ?? '?'} × ${
            settings.height ?? '?'
          }`,
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

      const reader = new BrowserMultiFormatOneDReader(hints);

      // La cámara ya está abierta: ZXing solo lee el video.
      const controls = await reader.decodeFromVideoElement(
        video,
        (result) => {
          if (!result || detectedRef.current) return;

          const code = result.getText().trim();

          if (!code) return;

          detectedRef.current = true;
          stopCamera();
          onScanRef.current(code);
        },
      );

      if (
        !mountedRef.current ||
        detectedRef.current ||
        !streamRef.current
      ) {
        controls.stop();
      } else {
        controlsRef.current = controls;
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err);

      console.error('Error de cámara:', err);

      if (mountedRef.current) {
        setError(message);
      }

      stopCamera();
    } finally {
      startingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      stopCamera();
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
          ? 'Abriendo cámara...'
          : active
            ? 'Cerrar cámara'
            : `Escanear ${label}`}
      </button>

      <div
        className={`relative overflow-hidden rounded-xl bg-black ${
          active || loading ? 'block' : 'hidden'
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="block aspect-[4/3] w-full object-contain"
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-[90%] rounded-lg border-4 border-white" />
        </div>
      </div>

      {active && (
        <p className="text-center text-sm text-slate-600">
          Enfoca únicamente las barras de {label}.
        </p>
      )}

      {cameraInfo && active && (
        <p className="text-center text-xs text-green-700">
          {cameraInfo}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          Error de cámara: {error}
        </p>
      )}
    </section>
  );
}
