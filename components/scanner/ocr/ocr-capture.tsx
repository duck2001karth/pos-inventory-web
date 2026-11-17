'use client';

import { useRef, type ChangeEvent } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import OcrCamera from './ocr-camera';

type Props = { disabled?: boolean; onImage: (file: File) => void };

export default function OcrCapture({ disabled = false, onImage }: Props) {
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onImage(file);
    event.target.value = '';
  }

  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled} onChange={handleFile} aria-label="Tomar fotografía nativa" />
      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={handleFile} aria-label="Elegir fotografía" />
      <button type="button" disabled={disabled} onClick={() => nativeCameraRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-3 font-semibold text-white disabled:opacity-50"><Camera size={18}/>Tomar fotografía</button>
      <button type="button" disabled={disabled} onClick={() => galleryRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--app-accent)] px-4 py-3 font-semibold text-[var(--app-accent)] disabled:opacity-50"><ImagePlus size={18}/>Subir desde galería</button>
    </div>
    <OcrCamera disabled={disabled} onImage={onImage} />
  </div>;
}
