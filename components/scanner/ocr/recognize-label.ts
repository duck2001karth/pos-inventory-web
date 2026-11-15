import { isValidImei, parseSunmiLabel, type SunmiLabelData } from '@/lib/utils/parse-sunmi-label';
import { preprocessOcrImage } from './image-preprocess';
import type { OcrField, OcrIssues } from './ocr-read-status';

export type OcrResult = {
  data: SunmiLabelData;
  rawText: string;
  passes: number;
  issues: OcrIssues;
};

type Progress = (value: number, status: string) => void;

// Two/three OCR passes are independent observations, not proof of accuracy.
// Prefer an agreed reading. If no consensus exists, require manual confirmation.
function choose(field: OcrField, values: string[], issues: OcrIssues): string {
  const nonEmpty = values.filter(Boolean);
  if (!nonEmpty.length) return '';
  const counts = new Map<string, number>();
  for (const value of nonEmpty) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 1) return ranked[0][0];
  if (ranked[0][1] > ranked[1][1]) {
    issues[field] = 'Hay otras lecturas distintas; compara los dígitos con la foto.';
    return ranked[0][0];
  }
  if (field === 'imei' || field === 'imei2') {
    const valid = ranked.filter(([value]) => isValidImei(value));
    if (valid.length === 1) {
      issues[field] = 'Lecturas discrepantes; se seleccionó el único IMEI con Luhn válido. Revisar foto.';
      return valid[0][0];
    }
  }
  issues[field] = 'Lecturas contradictorias sin consenso. Escribe el dato desde la etiqueta.';
  return '';
}

function combine(readings: SunmiLabelData[]): { data: SunmiLabelData; issues: OcrIssues } {
  const issues: OcrIssues = {};
  const values = (field: OcrField) => readings.map(item => item[field]);
  const data: SunmiLabelData = {
    imei: choose('imei', values('imei'), issues),
    imei2: choose('imei2', values('imei2'), issues),
    serialNumber: choose('serialNumber', values('serialNumber'), issues),
    model: choose('model', values('model'), issues),
    brand: readings.find(r => r.brand)?.brand ?? 'SUNMI',
    meid: readings.find(r => r.meid)?.meid ?? '',
  };
  return { data, issues };
}
function needExtraPass(result: {data: SunmiLabelData;issues: OcrIssues}) {
  const {data, issues} = result;
  if (Object.values(issues).some(Boolean)) return true;
  const v2s = /T5940|V2S/i.test(data.model);
  return !data.model || !data.serialNumber || !isValidImei(data.imei) || (v2s && !isValidImei(data.imei2));
}

export async function recognizeSunmiLabel(file: File, onProgress?: Progress): Promise<OcrResult> {
  onProgress?.(5, 'Preparando fotografía...');
  const { full, enhanced } = await preprocessOcrImage(file);
  onProgress?.(15, 'Iniciando Tesseract...');
  const { createWorker, PSM } = await import('tesseract.js');
  let pass = 1;
  const worker = await createWorker('eng', 1, {
    logger(message) {
      if (message.status !== 'recognizing text') return;
      const base = pass === 1 ? 20 : pass === 2 ? 55 : 83;
      const width = pass === 3 ? 13 : 30;
      onProgress?.(base + Math.round((message.progress ?? 0) * width), `Lectura OCR ${pass}...`);
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' });
    const firstText = (await worker.recognize(full)).data.text ?? '';
    pass = 2;
    const secondText = (await worker.recognize(enhanced)).data.text ?? '';
    const readings = [parseSunmiLabel(firstText), parseSunmiLabel(secondText)];
    let analysis = combine(readings);
    let extraText = '';
    if (needExtraPass(analysis)) {
      pass = 3;
      onProgress?.(82, 'Lectura adicional de recuperación...');
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      extraText = (await worker.recognize(enhanced)).data.text ?? '';
      readings.push(parseSunmiLabel(extraText));
      analysis = combine(readings);
    }
    onProgress?.(100, 'Reconocimiento finalizado.');
    const texts = [
      `=== LECTURA 1 ORIGINAL ===\n${firstText}`,
      `=== LECTURA 2 MEJORADA ===\n${secondText}`,
    ];
    if (extraText) texts.push(`=== LECTURA 3 RECUPERACIÓN ===\n${extraText}`);
    return { ...analysis, passes: readings.length, rawText: texts.join('\n\n') };
  } finally {
    await worker.terminate();
  }
}
