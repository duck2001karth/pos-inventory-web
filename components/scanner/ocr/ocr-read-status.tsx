import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { isValidImei, type SunmiLabelData } from '@/lib/utils/parse-sunmi-label';

export type OcrField = 'imei' | 'imei2' | 'serialNumber' | 'model';
export type OcrIssues = Partial<Record<OcrField, string>>;
export function checkOcrFields(data: SunmiLabelData) {
  const problems: string[] = [];
  const isV2s = data.model === 'V2s / T5940';
  const isV2Pro = data.model === 'V2 PRO / T5921';
  if (!isV2s && !isV2Pro) problems.push('Modelo sin identificar');
  if (!/^[A-Z0-9-]{6,100}$/.test(data.serialNumber)) problems.push('S/N faltante o inválido');
  if (!isValidImei(data.imei)) problems.push('IMEI 1 faltante o inválido');
  if (isV2s && !isValidImei(data.imei2)) problems.push('IMEI 2 obligatorio o inválido');
  if (isV2Pro && data.imei2 && !isValidImei(data.imei2)) problems.push('IMEI 2 inválido');
  if (data.imei2 && data.imei === data.imei2) problems.push('IMEI 1 e IMEI 2 iguales');
  return problems;
}
export default function OcrReadStatus({ data, issues = {} }: { data: SunmiLabelData; issues?: OcrIssues }) {
  const problems = checkOcrFields(data);
  const conflicts = Object.entries(issues).filter(([,message]) => Boolean(message));
  const complete = problems.length === 0 && conflicts.length === 0;
  const contradictory = conflicts.length > 0;
  return <div role="status" className={`rounded-xl border p-4 ${contradictory ? 'border-red-200 bg-red-50 text-red-900' : complete ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
    <p className="flex items-center gap-2 font-semibold">{contradictory ? <ShieldAlert size={20}/> : complete ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>} {contradictory ? 'Lecturas contradictorias: revisar' : complete ? 'Campos requeridos completos' : 'Lectura incompleta: revisar'}</p>
    {complete ? <p className="mt-1 text-sm">Los datos pasan las reglas automáticas. Compáralos con la etiqueta antes de confirmar.</p> : <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{problems.map(x => <li key={x}>{x}</li>)}{conflicts.map(([field,message]) => <li key={field}>{field}: {message}</li>)}</ul>}
    <p className="mt-2 text-xs">Estas comprobaciones no prueban la exactitud fotográfica del OCR; exige revisión visual.</p>
  </div>;
}
