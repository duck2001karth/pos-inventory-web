
'use client';

import { useRef } from 'react';
import { Camera, ImagePlus } from 'lucide-react';

type OcrCaptureProps = {
  disabled?: boolean;
  onImage: (file: File) => void;
};

export default function OcrCapture({
  disabled = false,
  onImage,
}: OcrCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      onImage(file);
    }

    event.target.value = '';
  }

  return (
    <div className="space-y-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        aria-label="Fotografiar etiqueta SUNMI"
        onChange={handleFile}
      />

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        aria-label="Seleccionar fotografía"
        onChange={handleFile}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          <Camera size={19} />
          Tomar fotografía
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-3 font-semibold text-blue-700 disabled:opacity-50"
        >
          <ImagePlus size={19} />
          Subir desde galería
        </button>
      </div>
    </div>
  );
}
