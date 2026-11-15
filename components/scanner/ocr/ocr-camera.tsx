'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Focus, LoaderCircle } from 'lucide-react';

type Props = { disabled?: boolean; onImage: (file: File) => void };
export default function OcrCamera({ disabled, onImage }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stop = () => {
    generation.current++;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
    setActive(false); setBusy(false);
  };
  useEffect(() => () => { generation.current++; streamRef.current?.getTracks().forEach(t => t.stop()); }, []);
  async function open() {
    if (busy || active || disabled) return;
    const id = ++generation.current; setError(''); setBusy(true); setActive(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara necesita HTTPS y permisos.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio:false, video:{ facingMode:{ideal:'environment'}, width:{ideal:1920}, height:{ideal:1080} } });
      if (id !== generation.current) { stream.getTracks().forEach(t=>t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('No se encontró el visor.');
      video.srcObject = stream;
      await video.play();
    } catch (e) { if (id === generation.current) { stop(); setError(e instanceof Error ? e.message : 'No fue posible abrir la cámara.'); } }
    finally { if (id === generation.current) setBusy(false); }
  }
  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setError('La cámara aún no está lista.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) { setError('No se pudo capturar la foto.'); return; }
    context.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) { setError('No se pudo generar la imagen.'); return; }
      stop(); onImage(new File([blob], 'etiqueta-sunmi.jpg', {type:'image/jpeg'}));
    }, 'image/jpeg', .94);
  }
  return <div className="space-y-3"><div className="flex flex-wrap gap-2">
    {!active ? <button type="button" disabled={disabled || busy} onClick={() => void open()} className="inline-flex items-center gap-2 rounded-xl border border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700"><Focus size={18}/>Abrir cámara con guía</button> : <><button type="button" disabled={disabled || busy} onClick={capture} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Camera size={18}/>Capturar etiqueta</button><button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm"><CameraOff size={18}/>Cerrar</button></>}
    {busy && <span className="inline-flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={17}/>Iniciando cámara...</span>}</div>
    <div className={active ? 'relative overflow-hidden rounded-xl bg-black' : 'hidden'}><video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full object-contain"/><div className="pointer-events-none absolute inset-[12%] rounded-xl border-4 border-dashed border-emerald-400/90"/><span className="pointer-events-none absolute bottom-3 left-3 right-3 rounded bg-black/70 p-2 text-center text-xs text-white">Incluye toda la etiqueta dentro del recuadro y mantén el teléfono firme</span></div>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error} Puedes usar «Tomar fotografía» como alternativa.</p>}
    <p className="text-xs text-slate-500">El marco es una guía de encuadre, no verifica enfoque ni lectura completa antes de capturar.</p>
  </div>;
}
