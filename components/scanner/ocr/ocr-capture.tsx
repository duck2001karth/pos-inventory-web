'use client';
import { useRef, type ChangeEvent } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import OcrCamera from './ocr-camera';
export default function OcrCapture({ disabled = false, onImage }: { disabled?: boolean; onImage: (file: File) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  function choose(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) onImage(file); event.target.value = ''; }
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled} onChange={choose}/><input ref={gallery} type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={choose}/><button type="button" disabled={disabled} onClick={()=>camera.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"><Camera size={18}/>Tomar fotografía</button><button type="button" disabled={disabled} onClick={()=>gallery.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-600 p-3 font-semibold text-blue-700 disabled:opacity-50"><ImagePlus size={18}/>Subir desde galería</button></div><OcrCamera disabled={disabled} onImage={onImage}/></div>;
}
