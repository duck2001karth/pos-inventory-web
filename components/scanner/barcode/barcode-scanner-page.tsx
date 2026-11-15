'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Barcode,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Info,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import ScannerPos from '@/components/scanner/scanner-pos';
import { isValidImei } from '@/lib/utils/parse-sunmi-label';
import BarcodeImageReader from './barcode-image-reader';

type DeviceModel = 'v2s' | 'v2pro';
type Field = 'imei1' | 'imei2' | 'sn';
type Method = 'camera' | 'image';

type Values = Record<Field, string>;
const blank: Values = { imei1: '', imei2: '', sn: '' };
const labels: Record<Field, string> = {
  imei1: 'IMEI 1', imei2: 'IMEI 2', sn: 'Número de serie',
};

export default function BarcodeScannerPage() {
  const [model, setModel] = useState<DeviceModel>('v2s');
  const [field, setField] = useState<Field>('imei1');
  const [method, setMethod] = useState<Method>('camera');
  const [values, setValues] = useState<Values>(blank);
  const [freeCode, setFreeCode] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [freeMode, setFreeMode] = useState(false);

  const required: Field[] = model === 'v2s' ? ['imei1', 'imei2', 'sn'] : ['imei1', 'sn'];
  const isFieldValid = (item: Field) => item === 'sn'
    ? /^[A-Z0-9-]{6,100}$/.test(values.sn)
    : isValidImei(values[item]);
  const completed = required.filter(isFieldValid).length;
  const allComplete = completed === required.length;

  function updateModel(next: DeviceModel) {
    setModel(next);
    setField('imei1');
    setValues(blank);
    setMessage('');
    setFreeMode(false);
  }

  function capture(raw: string) {
    const code = raw.trim();
    if (!code) return;
    setCopied(false);

    if (freeMode) {
      setFreeCode(code);
      setMessage('Código libre detectado. Ya puedes copiarlo.');
      return;
    }
    const normalized = field === 'sn'
      ? code.toUpperCase().replace(/\s/g, '')
      : code.replace(/\D/g, '');
    if (field !== 'sn' && !isValidImei(normalized)) {
      setMessage(`Se detectó «${code}», pero no es un IMEI válido de 15 dígitos. Comprueba que seleccionaste la barra correcta.`);
      return;
    }
    if (field === 'sn' && !/^[A-Z0-9-]{6,100}$/.test(normalized)) {
      setMessage(`Se leyó «${code}», pero el S/N tiene un formato inesperado. Verifica la etiqueta.`);
      return;
    }
    if (field === 'imei2' && normalized === values.imei1) {
      setMessage('IMEI 2 no debe coincidir con IMEI 1.');
      return;
    }
    setValues((previous) => ({ ...previous, [field]: normalized }));
    setMessage(`${labels[field]} leído y validado. Continúa con el siguiente identificador.`);
    if (field === 'imei1') setField(model === 'v2s' ? 'imei2' : 'sn');
    if (field === 'imei2') setField('sn');
  }

  function reset() {
    setValues(blank);
    setFreeCode('');
    setField('imei1');
    setMessage('');
    setCopied(false);
  }

  async function copyResult() {
    const output = freeMode
      ? freeCode
      : [
          `Modelo: SUNMI ${model === 'v2s' ? 'V2s / T5940' : 'V2 PRO / T5921'}`,
          `IMEI 1: ${values.imei1}`,
          ...(model === 'v2s' || values.imei2 ? [`IMEI 2: ${values.imei2}`] : []),
          `S/N: ${values.sn}`,
        ].join('\n');
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setMessage('Datos copiados al portapapeles.');
    } catch {
      setMessage('No se pudo copiar automáticamente. Selecciona los campos y cópialos.');
    }
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-slate-900 md:px-8 md:py-9">
      <div className="w-full space-y-7">
        <Link href="/inventario" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-600">
          <ArrowLeft size={18} /> Volver al inventario
        </Link>

        <header className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#101d3a] via-[#182b57] to-[#172c58] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#e94c62]/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 h-52 w-52 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-200">
                <Sparkles size={15} /> Herramientas inteligentes
              </span>
              <h1 className="max-w-xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Escanea, identifica <span className="text-orange-400">y sigue.</span>
              </h1>
              <p className="max-w-lg text-sm leading-7 text-white/85 sm:text-base">
                Captura los códigos SUNMI con tu cámara o fotografía. Verifica los datos antes de utilizarlos.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-white/85">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} className="text-orange-300" /> Sin guardado automático</span>
                <span className="inline-flex items-center gap-1.5"><Smartphone size={16} className="text-orange-300" /> Compatible con móvil</span>
              </div>
            </div>
            <div aria-hidden="true" className="hidden h-40 w-40 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-inner backdrop-blur-sm md:flex">
              <ScanLine size={86} className="text-orange-300" strokeWidth={1.4} />
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <section className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-100 p-3 text-orange-600"><Barcode size={25}/></div>
              <div><h2 className="text-xl font-bold">Configura tu lectura</h2><p className="text-sm text-slate-500">Elige el equipo y el identificador.</p></div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" aria-label="Tipo de lectura">
              <button type="button" onClick={() => { setFreeMode(false); setMessage(''); }} aria-pressed={!freeMode} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${!freeMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Identificadores</button>
              <button type="button" onClick={() => { setFreeMode(true); setMessage(''); }} aria-pressed={freeMode} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${freeMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Lectura libre QR</button>
            </div>

            {!freeMode && (
              <>
                <div className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Modelo SUNMI</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([{value:'v2s',name:'V2s',code:'T5940'},{value:'v2pro',name:'V2 PRO',code:'T5921'}] as const).map((item) => (
                      <button key={item.value} type="button" onClick={() => updateModel(item.value)} aria-pressed={model === item.value} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${model === item.value ? 'border-[#e94c62] bg-orange-50 text-rose-900' : 'border-slate-200 hover:border-slate-300'}`}>
                        <span><span className="block font-bold">{item.name}</span><span className="text-xs opacity-70">{item.code}</span></span>
                        {model === item.value && <CheckCircle2 size={21} className="text-orange-600" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <span className="text-sm font-bold text-slate-700">¿Qué vas a escanear?</span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {required.map((item, i) => (
                      <button key={item} type="button" onClick={() => { setField(item); setMessage(''); }} aria-pressed={field === item} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition ${field === item ? 'border-[#e94c62] bg-orange-50 text-rose-800' : 'border-slate-200 hover:border-orange-200'}`}>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isFieldValid(item) ? 'bg-emerald-100 text-emerald-700' : field === item ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {isFieldValid(item) ? <Check size={15} /> : i + 1}
                        </span>
                        {labels[item]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-4 border-t border-slate-100 pt-5">
              <h3 className="font-bold">Elige cómo escanear</h3>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMethod('camera')} aria-pressed={method === 'camera'} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${method === 'camera' ? 'bg-[#e94c62] text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-600'}`}><Camera size={18}/> Cámara en vivo</button>
                <button type="button" onClick={() => setMethod('image')} aria-pressed={method === 'image'} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${method === 'image' ? 'bg-[#e94c62] text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-600'}`}><ScanLine size={18}/> Fotografía</button>
              </div>
              {method === 'camera' ? (
                <ScannerPos key={`${freeMode}-${model}-${field}`} label={freeMode ? 'código QR o barras' : labels[field]} onScan={capture} />
              ) : (
                <BarcodeImageReader onScan={capture} />
              )}
              {message && <p role="status" className="flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm font-medium text-rose-900"><Info size={18} className="mt-0.5 shrink-0"/>{message}</p>}
            </div>
          </section>

          <aside className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-bold">Tu progreso</h2><p className="text-xs text-slate-500">Lectura en tiempo real</p></div>
              <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-800">{freeMode ? 'QR / Barras' : `${completed} / ${required.length}`}</span>
            </div>
            {!freeMode ? (
              <>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`Completado ${completed} de ${required.length}`}>
                  <div className="h-full rounded-full bg-[#e94c62] transition-all duration-500" style={{width:`${100 * completed / required.length}%`}} />
                </div>
                <div className="space-y-4">
                  {required.map((item) => (
                    <div className="space-y-1.5" key={item}>
                      <label htmlFor={`barcode-${item}`} className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                        {labels[item]} {isFieldValid(item) && <BadgeCheck size={17} className="text-emerald-600" />}
                      </label>
                      <input id={`barcode-${item}`} value={values[item]} maxLength={item === 'sn' ? 100 : 15} inputMode={item === 'sn' ? 'text' : 'numeric'} onChange={(event) => {
                        const val = item === 'sn' ? event.target.value.toUpperCase().replace(/\s/g,'').slice(0,100) : event.target.value.replace(/\D/g,'').slice(0,15);
                        setValues(prev => ({...prev, [item]:val})); setCopied(false);
                      }} placeholder={item === 'sn' ? 'Número de serie' : '15 dígitos'} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm outline-none focus:border-[#e94c62]" />
                    </div>
                  ))}
                </div>
                {allComplete && <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 size={19} className="shrink-0" /> Identificadores completos y válidos. Revisa la etiqueta antes de usarlos.</p>}
              </>
            ) : (
              <div className="space-y-2"><label htmlFor="free-code" className="text-sm font-bold">Código detectado</label><textarea id="free-code" value={freeCode} onChange={(event) => setFreeCode(event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm" placeholder="Aquí aparecerá el valor del QR o código de barras" /></div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={freeMode ? !freeCode : !allComplete} onClick={() => void copyResult()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#243047] px-3 py-3 text-sm font-bold text-white disabled:opacity-40"><ClipboardCopy size={17}/>{copied ? 'Copiado' : 'Copiar'}</button>
              <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><RotateCcw size={17}/> Reiniciar</button>
            </div>
            <p className="text-xs leading-5 text-slate-500">Esta herramienta no registra ni modifica dispositivos en Supabase. Para registrar, utiliza OCR o el formulario manual.</p>
            <Link href="/inventario/registrar" className="block rounded-xl border border-orange-300 p-3 text-center text-sm font-bold text-orange-700 transition hover:bg-orange-50">Ir a Registrar POS</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
