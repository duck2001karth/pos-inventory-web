'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, Focus, LoaderCircle, X } from 'lucide-react';

type Props = { disabled?: boolean; onImage: (file: File) => void };

export default function OcrCamera({ disabled = false, onImage }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generationRef = useRef(0);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  function stopStream() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  function closeCamera() {
    generationRef.current += 1;
    stopStream();
    setOpen(false);
    setStarting(false);
    setCapturing(false);
    setReady(false);
    openerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCamera();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => () => {
    generationRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function startCamera() {
    if (disabled || starting || open) return;
    const generation = ++generationRef.current;
    setError('');
    setReady(false);
    setStarting(true);
    setOpen(true);
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Para usar la cámara, abre la aplicación con HTTPS y concede permisos.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 3 / 4 },
        },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('No se encontró el visor de la cámara.');
      video.srcObject = stream;
      await video.play();
      if (generation === generationRef.current) setReady(true);
    } catch (cause) {
      if (generation === generationRef.current) {
        stopStream();
        setError(cause instanceof Error ? cause.message : 'No se pudo abrir la cámara.');
        setOpen(false);
      }
    } finally {
      if (generation === generationRef.current) setStarting(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !ready || capturing || disabled || !video.videoWidth || !video.videoHeight) return;
    const generation = generationRef.current;
    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      // Capture all original pixels (not a cropped screenshot of the preview).
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo crear la fotografía.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(result => result ? resolve(result) : reject(new Error('No se pudo generar la foto.')), 'image/jpeg', 0.95),
      );
      if (generation !== generationRef.current) return;
      closeCamera();
      onImage(new File([blob], `sunmi-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo capturar la imagen.');
    } finally {
      setCapturing(false);
    }
  }

  return <>
    <button
      ref={openerRef}
      type="button"
      disabled={disabled}
      onClick={() => void startCamera()}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-accent)] px-4 py-3 text-sm font-semibold text-[var(--app-accent)] disabled:opacity-50 sm:w-auto"
    >
      <Focus size={18} /> Abrir cámara vertical
    </button>
    {error && !open && <p role="alert" className="mt-2 text-sm text-red-600">{error} Puedes utilizar «Tomar fotografía» como alternativa.</p>}
    {open && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[300] flex flex-col bg-[#090c13] text-white" role="dialog" aria-modal="true" aria-label="Cámara vertical para etiqueta SUNMI">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <div><h2 className="font-bold">Fotografiar etiqueta SUNMI</h2><p className="text-xs text-white/70">Encuadra toda la etiqueta de arriba abajo.</p></div>
          <button ref={closeRef} type="button" onClick={closeCamera} aria-label="Cerrar cámara" className="rounded-xl border border-white/25 p-3"><X size={22}/></button>
        </header>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="relative h-[85%] max-h-[860px] w-[90%] max-w-[530px] rounded-[2rem] border-2 border-dashed border-emerald-400 shadow-[0_0_0_100vmax_rgba(0,0,0,0.20)]">
              <div className="absolute inset-x-3 top-3 rounded-lg bg-black/55 px-2 py-2 text-center text-xs font-semibold">Etiqueta completa dentro del marco</div>
            </div>
          </div>
          {starting && <span role="status" className="absolute flex items-center gap-2 rounded-xl bg-black/75 p-3 text-sm"><LoaderCircle className="animate-spin" size={19}/>Abriendo cámara...</span>}
          {error && <p role="alert" className="absolute bottom-4 left-4 right-4 rounded-xl bg-red-900/90 p-3 text-sm">{error}</p>}
        </div>
        <footer className="shrink-0 space-y-2 border-t border-white/15 bg-[#111827] px-4 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <p className="text-center text-xs text-white/75">Mantén el teléfono vertical, con buena luz y sin moverlo.</p>
          <div className="flex gap-3">
            <button type="button" onClick={closeCamera} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-3 font-semibold"><CameraOff size={18}/>Cerrar</button>
            <button type="button" disabled={!ready || starting || capturing || disabled} onClick={() => void capture()} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-3 font-bold disabled:opacity-50"><Camera size={20}/>{capturing ? 'Capturando...' : 'Capturar etiqueta'}</button>
          </div>
        </footer>
      </div>, document.body,
    )}
  </>;
}
