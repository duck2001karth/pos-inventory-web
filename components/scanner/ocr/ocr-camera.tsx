'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, Focus, LoaderCircle, X } from 'lucide-react';
import CameraControls, { acquireCamera, acquirePreferredCamera } from '@/components/scanner/camera/camera-controls';

type Props = { disabled?: boolean; onImage: (file: File) => void };

export default function OcrCamera({ disabled = false, onImage }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentRef = useRef<MediaStream | null>(null);
  const generationRef = useRef(0);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  function stop() {
    currentRef.current?.getTracks().forEach(track => track.stop());
    currentRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  function close() {
    ++generationRef.current;
    stop();
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
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  useEffect(() => () => {
    generationRef.current++;
    currentRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function start(deviceId?: string) {
    const token = ++generationRef.current;
    setOpen(true);
    setStarting(true);
    setReady(false);
    setError('');
    stop();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('La cámara requiere HTTPS y permiso del navegador.');
      }
      const newStream = deviceId ? await acquireCamera(deviceId) : await acquirePreferredCamera();
      if (token !== generationRef.current) {
        newStream.getTracks().forEach(track => track.stop());
        return;
      }
      currentRef.current = newStream;
      const video = videoRef.current;
      if (!video) throw new Error('No se encontró el visor de cámara.');
      video.srcObject = newStream;
      await video.play();
      if (token !== generationRef.current) return;
      setStream(newStream);
      setReady(true);
    } catch (cause) {
      if (token === generationRef.current) {
        stop();
        setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la cámara.');
      }
    } finally {
      if (token === generationRef.current) setStarting(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !ready || capturing || disabled || !video.videoWidth || !video.videoHeight) return;
    const token = generationRef.current;
    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      // The full-resolution frame is sent to the OCR, not an enlarged CSS preview.
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No fue posible preparar la imagen.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error('Falló la captura.')), 'image/jpeg', .95);
      });
      if (token !== generationRef.current) return;
      close();
      onImage(new File([blob], `sunmi-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    } catch (cause) {
      if (token === generationRef.current) setError(cause instanceof Error ? cause.message : 'Error capturando imagen.');
    } finally {
      if (token === generationRef.current) setCapturing(false);
    }
  }

  return <>
    <button ref={openerRef} type="button" disabled={disabled} onClick={() => void start()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-accent)] px-4 py-3 text-sm font-semibold text-[var(--app-accent)] disabled:opacity-50 sm:w-auto">
      <Focus size={18}/> Abrir cámara OCR con zoom
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div role="dialog" aria-modal="true" aria-label="Cámara OCR con zoom" className="fixed inset-0 z-[300] flex flex-col bg-[#090c13] text-white">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <div><h2 className="font-bold">Fotografiar etiqueta SUNMI</h2><p className="text-xs text-white/70">Elige la cámara principal (1×) y ajusta el zoom si aparece.</p></div>
          <button ref={closeRef} type="button" onClick={close} aria-label="Cerrar cámara" className="rounded-xl border border-white/25 p-3"><X size={22}/></button>
        </header>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="relative h-[85%] max-h-[860px] w-[90%] max-w-[530px] rounded-[2rem] border-2 border-dashed border-emerald-400 shadow-[0_0_0_100vmax_rgba(0,0,0,.20)]">
              <span className="absolute inset-x-3 top-3 rounded-lg bg-black/55 p-2 text-center text-xs font-semibold">Etiqueta completa dentro del marco</span>
            </div>
          </div>
          {starting && <div role="status" className="absolute flex items-center gap-2 rounded-xl bg-black/80 p-3 text-sm"><LoaderCircle size={18} className="animate-spin"/>Iniciando cámara...</div>}
          {error && <p role="alert" className="absolute bottom-3 left-3 right-3 rounded-xl bg-red-900/90 p-3 text-sm">{error}</p>}
        </div>
        <footer className="max-h-[42dvh] shrink-0 space-y-3 overflow-y-auto border-t border-white/15 bg-[#111827] px-4 py-3" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {stream && <CameraControls stream={stream} disabled={starting || capturing} onSwitch={id => void start(id)} />}
          <p className="text-center text-xs text-white/75">Mantén el teléfono vertical y enfoca el texto antes de capturar.</p>
          <div className="flex gap-2">
            <button type="button" onClick={close} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 px-3 py-3 text-sm font-semibold"><CameraOff size={18}/>Cerrar</button>
            <button type="button" disabled={!ready || starting || capturing || disabled} onClick={() => void capture()} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#e94c62] px-3 py-3 text-sm font-bold text-white disabled:opacity-50"><Camera size={19}/>{capturing ? 'Capturando...' : 'Capturar etiqueta'}</button>
          </div>
        </footer>
      </div>, document.body,
    )}
  </>;
}
