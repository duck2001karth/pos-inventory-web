
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  LoaderCircle,
  ScanLine,
} from 'lucide-react';

import type { IScannerControls } from '@zxing/browser';

type ScannerPosProps = {
  onScan: (code: string) => void;
  label?: string;
};

export default function ScannerPos({
  onScan,
  label = 'código QR o de barras',
}: ScannerPosProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const onScanRef = useRef(onScan);

  const startingRef = useRef(false);
  const detectedRef = useRef(false);
  const mountedRef = useRef(false);

  // Permite cancelar un inicio de cámara todavía pendiente.
  const sessionRef = useRef(0);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');
  const [cameraInfo, setCameraInfo] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  function releaseCamera(updateState = true) {
    // Invalida cualquier operación de apertura pendiente.
    sessionRef.current += 1;

    controlsRef.current?.stop();
    controlsRef.current = null;

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    startingRef.current = false;

    if (updateState && mountedRef.current) {
      setActive(false);
      setLoading(false);
      setCameraInfo('');
    }
  }

  async function startCamera() {
    if (startingRef.current || streamRef.current) {
      return;
    }

    const sessionId = ++sessionRef.current;

    startingRef.current = true;
    detectedRef.current = false;

    setLoading(true);
    setActive(true);
    setError('');
    setLastCode('');
    setCameraInfo('');

    try {
      if (!window.isSecureContext) {
        throw new Error(
          'La cámara requiere una conexión HTTPS segura.',
        );
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Este navegador no permite acceder a la cámara.',
        );
      }

      // Solicitar primero la cámara trasera.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: 'environment',
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
      });

      if (
        !mountedRef.current ||
        sessionId !== sessionRef.current
      ) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error(
          'No se encontró el visor de la cámara.',
        );
      }

      // Configuración importante para Safari en iPhone.
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;

      await video.play();

      if (
        !mountedRef.current ||
        sessionId !== sessionRef.current
      ) {
        return;
      }

      const track = stream.getVideoTracks()[0];

      if (!track || track.readyState !== 'live') {
        throw new Error(
          'La cámara no está transmitiendo video.',
        );
      }

      const settings = track.getSettings();

      setCameraInfo(
        `Cámara activa: ${settings.width ?? '?'} × ${
          settings.height ?? '?'
        }`,
      );

      // Cargar ZXing solo después de abrir el video.
      const { BrowserMultiFormatReader } =
        await import('@zxing/browser');

      const { BarcodeFormat, DecodeHintType } =
        await import('@zxing/library');

      const hints = new Map<
        import('@zxing/library').DecodeHintType,
        unknown
      >();

      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.EAN_13,
        BarcodeFormat.QR_CODE,
      ]);

      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 150,
      });

      if (
        !mountedRef.current ||
        sessionId !== sessionRef.current
      ) {
        return;
      }

      // ZXing analiza el video ya abierto.
      const controls = await reader.decodeFromVideoElement(
        video,
        (result) => {
          if (
            !result ||
            detectedRef.current ||
            sessionId !== sessionRef.current
          ) {
            return;
          }

          const code = result.getText().trim();

          if (!code) return;

          detectedRef.current = true;

          setLastCode(code);

          // Primero detener la cámara.
          releaseCamera();

          // Después entregar el resultado al formulario.
          onScanRef.current(code);
        },
      );

      if (
        sessionId !== sessionRef.current ||
        !mountedRef.current ||
        detectedRef.current
      ) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
    } catch (err) {
      if (
        !mountedRef.current ||
        sessionId !== sessionRef.current
      ) {
        return;
      }

      const message =
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err);

      console.error('Error al iniciar escáner:', err);

      releaseCamera();

      setError(message);
    } finally {
      if (sessionId === sessionRef.current) {
        startingRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      releaseCamera(false);
    };
  }, []);

  return (
    <section className="space-y-4">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          if (active) {
            releaseCamera();
          } else {
            void startCamera();
          }
        }}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-4 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <LoaderCircle
              size={21}
              className="animate-spin"
            />
            Iniciando cámara...
          </>
        ) : active ? (
          <>
            <CameraOff size={21} />
            Cerrar cámara
          </>
        ) : (
          <>
            <Camera size={21} />
            Escanear {label}
          </>
        )}
      </button>

      {/* El video permanece montado para evitar
          problemas de inicialización en Safari. */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-black ${
          active ? 'block' : 'hidden'
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="block aspect-[4/3] w-full object-contain"
        />

        {/* Guía visual para centrar el código */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-28 w-[88%] rounded-lg border-[3px] border-white shadow-lg">
            <div className="absolute -left-1 -top-1 h-7 w-7 rounded-tl-lg border-l-4 border-t-4 border-blue-400" />

            <div className="absolute -right-1 -top-1 h-7 w-7 rounded-tr-lg border-r-4 border-t-4 border-blue-400" />

            <div className="absolute -bottom-1 -left-1 h-7 w-7 rounded-bl-lg border-b-4 border-l-4 border-blue-400" />

            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-br-lg border-b-4 border-r-4 border-blue-400" />
          </div>
        </div>

        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <span className="rounded-full bg-black/65 px-4 py-2 text-xs text-white">
            <ScanLine
              size={15}
              className="mr-2 inline-block"
            />
            Enfoca el código
          </span>
        </div>
      </div>

      {active && (
        <div className="space-y-1 text-center">
          <p className="text-sm text-slate-600">
            Mantén el código horizontal, completo y
            bien enfocado.
          </p>

          <p className="text-xs text-slate-400">
            Para SUNMI, enfoca una sola fila de barras.
          </p>
        </div>
      )}

      {cameraInfo && active && (
        <p className="text-center text-xs text-green-700">
          {cameraInfo}
        </p>
      )}

      {lastCode && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"
        >
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Código reconocido
            </p>

            <p className="mt-1 break-all font-mono text-sm">
              {lastCode}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">
            No se pudo utilizar el escáner
          </p>

          <p className="mt-2 break-words">{error}</p>

          <p className="mt-2 text-xs">
            Revisa los permisos de la cámara en Safari
            o Chrome e inténtalo nuevamente.
          </p>
        </div>
      )}
    </section>
  );
}
