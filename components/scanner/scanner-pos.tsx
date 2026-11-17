'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Barcode, Camera, CameraOff, CheckCircle2, LoaderCircle, ScanLine, X } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';

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
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  function stopResources() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  function close() {
    sessionRef.current += 1;
    stopResources();
    setOpen(false);
    setLoading(false);
    openerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const request = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = original; cancelAnimationFrame(request); document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  useEffect(() => () => {
    sessionRef.current += 1;
    controlsRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function start() {
    if (open || loading) return;
    const token = ++sessionRef.current;
    setOpen(true);
    setLoading(true);
    setError('');
    setLastCode('');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Para escanear necesitas HTTPS y permiso de cámara.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (token !== sessionRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('No se encontró la vista de cámara.');
      video.srcObject = stream;
      await video.play();
      if (token !== sessionRef.current) return;

      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'), import('@zxing/library'),
      ]);
      const hints = new Map<import('@zxing/library').DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, mode === 'qr'
        ? [BarcodeFormat.QR_CODE]
        : [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.EAN_13, BarcodeFormat.ITF]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
      if (token !== sessionRef.current) return;
      const controls = await reader.decodeFromVideoElement(video, result => {
        if (!result || token !== sessionRef.current) return;
        const value = result.getText().trim();
        if (!value) return;
        setLastCode(value);
        close();
        onScanRef.current(value);
      });
      if (token !== sessionRef.current) controls.stop();
      else controlsRef.current = controls;
    } catch (cause) {
      if (token === sessionRef.current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo escanear.');
        stopResources();
      }
    } finally {
      if (token === sessionRef.current) setLoading(false);
    }
  }

  return <section className="space-y-3">
    <button ref={openerRef} type="button" onClick={() => void start()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-3.5 font-semibold text-white">
      {mode === 'qr' ? <ScanLine size={20}/> : <Barcode size={20}/>}
      {mode === 'qr' ? 'Abrir lector QR' : `Escanear ${label}`}
    </button>
    {lastCode && <div role="status" className="flex gap-2 rounded-xl border border-emerald-300 p-3 text-sm"><CheckCircle2 size={18}/><span className="break-all">Código reconocido: {lastCode}</span></div>}
    {error && !open && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {open && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[300] flex flex-col bg-[#090c13] text-white" role="dialog" aria-modal="true" aria-label={`Lector ${mode === 'qr' ? 'QR' : 'de barras'}`}>
        <header className="flex shrink-0 items-center justify-between border-b border-white/20 p-4" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <div><h2 className="font-bold">{mode === 'qr' ? 'Lector QR' : 'Lector de barras'}</h2><p className="text-xs text-white/70">{mode === 'qr' ? 'Centra el QR en el cuadro' : 'Coloca UNA sola fila de barras en el marco horizontal'}</p></div>
          <button ref={closeRef} type="button" onClick={close} aria-label="Cerrar lector" className="rounded-xl border border-white/30 p-3"><X size={22}/></button>
        </header>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
            <div className={mode === 'qr'
              ? 'relative aspect-square w-[min(78vw,360px)] rounded-3xl border-[3px] border-emerald-400 shadow-[0_0_0_100vmax_rgba(0,0,0,.24)]'
              : 'relative h-[clamp(100px,21dvh,175px)] w-[min(92vw,860px)] rounded-2xl border-[3px] border-emerald-400 shadow-[0_0_0_100vmax_rgba(0,0,0,.24)]'}>
              {mode === 'barcode' && <div className="absolute left-2 right-2 top-1/2 h-[2px] bg-red-400/80"/>}
            </div>
          </div>
          {loading && <span role="status" className="absolute bottom-6 flex items-center gap-2 rounded-xl bg-black/80 px-4 py-3 text-sm"><LoaderCircle size={19} className="animate-spin"/>Activando lector...</span>}
          {error && <p role="alert" className="absolute bottom-5 left-5 right-5 rounded-xl bg-red-900/90 p-3 text-sm">{error}</p>}
        </div>
        <footer className="shrink-0 space-y-3 border-t border-white/20 bg-[#111827] p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <p className="text-center text-xs text-white/75">{mode === 'barcode' ? 'Mantén la fila horizontal, acercándola poco a poco hasta lograr enfoque.' : 'Mantén el QR completo, iluminado y sin reflejos.'}</p>
          <button type="button" onClick={close} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 px-4 py-3 font-semibold"><CameraOff size={18}/>Cerrar cámara</button>
        </footer>
      </div>, document.body,
    )}
  </section>;
}
