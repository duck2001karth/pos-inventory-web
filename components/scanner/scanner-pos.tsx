'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Barcode, CameraOff, CheckCircle2, LoaderCircle, ScanLine, X } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';
import CameraControls, { acquireCamera, acquirePreferredCamera } from '@/components/scanner/camera/camera-controls';

type Props = {
  onScan: (code: string) => void;
  label?: string;
  mode?: 'barcode' | 'qr';
};

export default function ScannerPos({ onScan, label = 'código de barras', mode = 'barcode' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onScanRef = useRef(onScan);
  const sessionRef = useRef(0);
  const foundRef = useRef(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  function release() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  function close() {
    sessionRef.current++;
    release();
    setOpen(false);
    setLoading(false);
    openerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = overflow; cancelAnimationFrame(raf); document.removeEventListener('keydown', escape); };
  }, [open]);

  useEffect(() => () => {
    sessionRef.current++;
    controlsRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function start(deviceId?: string) {
    const token = ++sessionRef.current;
    foundRef.current = false;
    setOpen(true);
    setLoading(true);
    setError('');
    setLastCode('');
    release();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Necesitas HTTPS y permisos de cámara para escanear.');
      }
      const camera = deviceId ? await acquireCamera(deviceId) : await acquirePreferredCamera();
      if (token !== sessionRef.current) { camera.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = camera;
      const video = videoRef.current;
      if (!video) throw new Error('No se encontró el visor.');
      video.srcObject = camera;
      await video.play();
      if (token !== sessionRef.current) return;
      setStream(camera);

      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'), import('@zxing/library'),
      ]);
      if (token !== sessionRef.current) return;
      const hints = new Map<import('@zxing/library').DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, mode === 'qr'
        ? [BarcodeFormat.QR_CODE]
        : [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.EAN_13, BarcodeFormat.ITF]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 180 });
      const controls = await reader.decodeFromVideoElement(video, result => {
        if (!result || token !== sessionRef.current || foundRef.current) return;
        const value = result.getText().trim();
        if (!value) return;
        foundRef.current = true;
        setLastCode(value);
        close();
        onScanRef.current(value);
      });
      if (token !== sessionRef.current || foundRef.current) controls.stop();
      else controlsRef.current = controls;
    } catch (cause) {
      if (token === sessionRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la lectura.');
        release();
      }
    } finally {
      if (token === sessionRef.current) setLoading(false);
    }
  }

  return <section className="space-y-3">
    <button ref={openerRef} type="button" onClick={() => void start()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-3.5 font-semibold text-white">
      {mode === 'qr' ? <ScanLine size={20}/> : <Barcode size={20}/>} {mode === 'qr' ? 'Abrir lector QR con zoom' : `Escanear ${label} con zoom`}
    </button>
    {lastCode && <p role="status" className="flex gap-2 rounded-xl border border-emerald-300 p-3 text-sm"><CheckCircle2 size={18}/><span className="break-all">Código reconocido: {lastCode}</span></p>}
    {open && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[300] flex flex-col bg-[#090c13] text-white" role="dialog" aria-modal="true" aria-label={`Lector ${mode === 'qr' ? 'QR' : 'de barras'} con zoom`}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/20 p-4" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <div><h2 className="font-bold">{mode === 'qr' ? 'Lector QR' : 'Lector de barras'}</h2><p className="text-xs text-white/70">{mode === 'qr' ? 'Centra el QR en el recuadro.' : 'Acerca UNA fila horizontal de barras y ajusta el zoom.'}</p></div>
          <button ref={closeRef} type="button" onClick={close} aria-label="Cerrar lector" className="rounded-xl border border-white/30 p-3"><X size={22}/></button>
        </header>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
            <div className={mode === 'qr'
              ? 'relative aspect-square w-[min(78vw,360px)] rounded-3xl border-[3px] border-emerald-400 shadow-[0_0_0_100vmax_rgba(0,0,0,.24)]'
              : 'relative h-[clamp(90px,18dvh,165px)] w-[min(92vw,860px)] rounded-2xl border-[3px] border-emerald-400 shadow-[0_0_0_100vmax_rgba(0,0,0,.24)]'}>
              {mode === 'barcode' && <div className="absolute left-2 right-2 top-1/2 h-[2px] bg-rose-400/80"/>}
            </div>
          </div>
          {loading && <span role="status" className="absolute bottom-5 flex items-center gap-2 rounded-xl bg-black/80 px-4 py-3 text-sm"><LoaderCircle size={18} className="animate-spin"/>Iniciando lector...</span>}
          {error && <p role="alert" className="absolute bottom-3 left-3 right-3 rounded-xl bg-red-900/90 p-3 text-sm">{error}</p>}
        </div>
        <footer className="max-h-[42dvh] shrink-0 space-y-3 overflow-y-auto border-t border-white/20 bg-[#111827] p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {stream && <CameraControls stream={stream} disabled={loading} onSwitch={id => void start(id)} />}
          <p className="text-center text-xs text-white/75">{mode === 'qr' ? 'Incluye todo el código QR, con buena iluminación.' : 'La guía debe contener una sola fila de barras. El zoom no sustituye un buen enfoque.'}</p>
          <button type="button" onClick={close} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 px-4 py-3 font-semibold"><CameraOff size={18}/>Cerrar cámara</button>
        </footer>
      </div>, document.body,
    )}
  </section>;
}
