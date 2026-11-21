import { isValidImei } from '@/lib/utils/parse-sunmi-label';
import type { BatchItem } from './batch-types';

export function normalizeSunmiModel(value: string) {
  const text = value.toUpperCase();
  if (text.includes('V2S') || text.includes('T5940')) return 'V2s / T5940';
  if (text.includes('V2 PRO') || text.includes('T5921')) return 'V2 PRO / T5921';
  return '';
}

export function validateBatchItem(item: BatchItem): string | null {
  const { model, serialNumber, imei, imei2 } = item.data;
  if (model !== 'V2s / T5940' && model !== 'V2 PRO / T5921') return 'Selecciona el modelo SUNMI.';
  if (!/^[A-Z0-9-]{6,100}$/.test(serialNumber)) return 'Revisa el número de serie.';
  if (!isValidImei(imei)) return 'El IMEI 1 no es válido (15 dígitos y Luhn).';
  if (model === 'V2s / T5940' && !isValidImei(imei2)) return 'El IMEI 2 es obligatorio para V2s.';
  if (imei2 && !isValidImei(imei2)) return 'El IMEI 2 no es válido.';
  if (imei2 && imei === imei2) return 'IMEI 1 e IMEI 2 deben ser distintos.';
  if (item.notes.length > 1000) return 'Las observaciones admiten máximo 1000 caracteres.';
  return null;
}

/** Un identificador no puede repetirse ni cruzarse entre IMEI 1 e IMEI 2. */
export function findLocalCollision(item: BatchItem, all: BatchItem[]): string | null {
  const ids = [item.data.imei, item.data.imei2].filter(Boolean);
  for (const other of all) {
    if (other.id === item.id || other.status === 'error' || other.status === 'pending' || other.status === 'processing') continue;
    if (item.data.serialNumber && item.data.serialNumber === other.data.serialNumber) return `S/N repetido en ${other.name}`;
    const otherIds = [other.data.imei, other.data.imei2].filter(Boolean);
    if (ids.some(v => otherIds.includes(v))) return `IMEI repetido en ${other.name}`;
  }
  return null;
}

export async function verifyInDatabase(item: BatchItem, signal?: AbortSignal): Promise<{ duplicate: boolean; message: string }> {
  const params = new URLSearchParams({ serial: item.data.serialNumber, imei: item.data.imei });
  if (item.data.imei2) params.set('imei2', item.data.imei2);
  const response = await fetch(`/api/devices?${params}`, {
    credentials: 'same-origin', cache: 'no-store', signal,
  });
  let body: { exists?: boolean; error?: string; device?: { internalCode?: string } };
  try { body = await response.json(); } catch { throw new Error(`La verificación respondió HTTP ${response.status}.`); }
  if (!response.ok) throw new Error(body.error || 'No se pudo comprobar el inventario.');
  return body.exists
    ? { duplicate: true, message: `Ya existe en inventario: ${body.device?.internalCode ?? 'dispositivo registrado'}` }
    : { duplicate: false, message: 'Identificadores disponibles. Revisa la fotografía y confirma.' };
}
