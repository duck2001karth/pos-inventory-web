
import {
  parseSunmiLabel,
  type SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

import { preprocessOcrImage } from './image-preprocess';

export type OcrResult = {
  data: SunmiLabelData;
  rawText: string;
  passes: number;
};

type ProgressCallback = (
  progress: number,
  message: string,
) => void;

function chooseDetectedValue(
  primary: string,
  secondary: string,
): string {
  // Evitamos inventar un resultado si las dos lecturas
  // devuelven valores diferentes.
  if (primary && secondary && primary !== secondary) {
    return '';
  }

  return primary || secondary;
}

export async function recognizeSunmiLabel(
  file: File,
  onProgress?: ProgressCallback,
): Promise<OcrResult> {
  const { createWorker, PSM } =
    await import('tesseract.js');

  onProgress?.(5, 'Preparando fotografía...');

  const images = await preprocessOcrImage(file);

  onProgress?.(15, 'Cargando motor OCR...');

  let currentPass = 0;

  const worker = await createWorker('eng', 1, {
    logger: (message) => {
      if (message.status !== 'recognizing text') {
        return;
      }

      const passProgress = Math.round(
        (message.progress ?? 0) * 30,
      );

      const base = currentPass === 1 ? 20 : 60;

      onProgress?.(
        base + passProgress,
        currentPass === 1
          ? 'Leyendo etiqueta completa...'
          : 'Releyendo identificadores...',
      );
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    });

    // Primera pasada: fotografía completa.
    currentPass = 1;

    const first = await worker.recognize(images.full);

    const firstText = first.data.text ?? '';
    const firstData = parseSunmiLabel(firstText);

    onProgress?.(55, 'Preparando segunda lectura...');

    // Segunda pasada: versión ampliada y con contraste.
    currentPass = 2;

    const second = await worker.recognize(images.enhanced);

    const secondText = second.data.text ?? '';
    const secondData = parseSunmiLabel(secondText);

    const data: SunmiLabelData = {
      imei: chooseDetectedValue(
        firstData.imei,
        secondData.imei,
      ),
      imei2: chooseDetectedValue(
        firstData.imei2,
        secondData.imei2,
      ),
      serialNumber: chooseDetectedValue(
        firstData.serialNumber,
        secondData.serialNumber,
      ),
      brand: chooseDetectedValue(
        firstData.brand,
        secondData.brand,
      ),
      model: chooseDetectedValue(
        firstData.model,
        secondData.model,
      ),
      meid: chooseDetectedValue(
        firstData.meid ?? '',
        secondData.meid ?? '',
      ),
    };

    onProgress?.(100, 'Reconocimiento finalizado.');

    return {
      data,
      rawText: [
        '=== LECTURA ORIGINAL ===',
        firstText,
        '=== LECTURA MEJORADA ===',
        secondText,
      ].join('\n\n'),
      passes: 2,
    };
  } finally {
    await worker.terminate();
  }
}
