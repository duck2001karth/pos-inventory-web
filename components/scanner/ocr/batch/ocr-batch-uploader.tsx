'use client';
import { useRef, type ChangeEvent } from 'react';
import { Camera, Images, Plus } from 'lucide-react';

export default function OcrBatchUploader({disabled, onFiles}: {
  disabled: boolean; onFiles: (files: File[]) => void;
}) {
  const gallery = useRef<HTMLInputElement>(null);
  const nativeCamera = useRef<HTMLInputElement>(null);
  function select(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) onFiles(Array.from(event.target.files));
    event.target.value = '';
  }
  return <div className="grid gap-2 sm:grid-cols-2">
    <input ref={gallery} className="sr-only" type="file" accept="image/*" multiple disabled={disabled} onChange={select} aria-label="Seleccionar múltiples etiquetas" />
    <input ref={nativeCamera} className="sr-only" type="file" accept="image/*" capture="environment" disabled={disabled} onChange={select} aria-label="Fotografiar una etiqueta" />
    <button type="button" disabled={disabled} onClick={() => gallery.current?.click()} className="app-primary min-h-12 w-full disabled:opacity-50"><Images size={19}/>Elegir varias fotos<Plus size={16}/></button>
    <button type="button" disabled={disabled} onClick={() => nativeCamera.current?.click()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold disabled:opacity-50"><Camera size={19}/>Tomar otra foto</button>
  </div>;
}
