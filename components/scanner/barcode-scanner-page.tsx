'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, ClipboardCopy, RotateCcw } from 'lucide-react';
import ScannerPos from '@/components/scanner/scanner-pos';
import BarcodeImageReader from './barcode/barcode-image-reader';
import { isValidImei } from '@/lib/utils/parse-sunmi-label';

type Field = 'imei1' | 'imei2' | 'sn';
const labels: Record<Field,string>={ imei1:'IMEI 1',imei2:'IMEI 2',sn:'S/N' };
export default function BarcodeScannerPage(){
  const [model,setModel]=useState('V2s / T5940');
  const [field,setField]=useState<Field>('imei1');
  const [values,setValues]=useState({ imei1:'', imei2:'', sn:'' });
  const [message,setMessage]=useState('');
  const isV2s=model==='V2s / T5940';
  function handleScan(raw:string){const code=raw.trim();if(!code)return;
    if(field!=='sn'&&!isValidImei(code)){setMessage(`El valor de ${labels[field]} no es un IMEI válido: ${code}. Revisa la etiqueta.`);return;}
    if(field==='sn'&&!/^[A-Za-z0-9-]{6,100}$/.test(code)){setMessage('El S/N no tiene el formato esperado.');return;}
    setValues(prev=>({...prev,[field]:code.toUpperCase()}));setMessage(`${labels[field]} reconocido. Revisa el valor antes de utilizarlo.`);
    if(field==='imei1')setField(isV2s?'imei2':'sn');else if(field==='imei2')setField('sn');
  }
  const combined=`Modelo: ${model}\nIMEI 1: ${values.imei1}\nIMEI 2: ${values.imei2 || 'No aplica'}\nS/N: ${values.sn}`;
  return <main className="mx-auto max-w-2xl space-y-6 p-4 pb-12 md:p-8"><header><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Herramientas</p><h1 className="mt-2 text-2xl font-bold">Lector de barras / QR</h1><p className="mt-2 text-sm text-slate-500">Esta herramienta solo lee códigos; no registra dispositivos en Supabase.</p></header><section className="space-y-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><label className="block text-sm font-semibold">Modelo<select className="mt-2 w-full rounded-xl border p-3" value={model} onChange={e=>{setModel(e.target.value);setField('imei1');setValues({imei1:'',imei2:'',sn:''});setMessage('');}}><option value="V2s / T5940">SUNMI V2s — dos IMEI</option><option value="V2 PRO / T5921">SUNMI V2 PRO — un IMEI</option></select></label><h2 className="font-semibold">1. Identificador a leer</h2><div className="grid gap-2 sm:grid-cols-3">{(['imei1', ...(isV2s?['imei2']:[]), 'sn'] as Field[]).map(item=><button key={item} type="button" onClick={()=>setField(item)} className={`rounded-xl border p-3 text-left text-sm ${field===item?'border-blue-600 bg-blue-50':'border-slate-200'}`}><span className="flex items-center justify-between font-semibold">{labels[item]}{values[item]&&<CheckCircle2 size={17} className="text-emerald-600"/>}</span><span className="mt-1 block break-all font-mono text-xs text-slate-500">{values[item]||'Pendiente'}</span></button>)}</div><div className="space-y-3 border-t pt-5"><h2 className="font-semibold">2. Escanear {labels[field]}</h2><ScannerPos key={field} label={labels[field]} onScan={handleScan}/><BarcodeImageReader onScan={handleScan}/>{message&&<p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">{message}</p>}</div><div className="space-y-3 border-t pt-5"><h2 className="font-semibold">3. Datos reconocidos</h2>{(['imei1', ...(isV2s?['imei2']:[]),'sn'] as Field[]).map(item=><label key={item} className="block space-y-1 text-sm font-medium">{labels[item]}<input className="w-full rounded-xl border p-3 font-mono text-base" value={values[item]} onChange={e=>setValues(prev=>({...prev,[item]:item==='sn'?e.target.value.toUpperCase():e.target.value.replace(/\D/g,'').slice(0,15)}))}/></label>)}<div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(combined);setMessage('Valores copiados.');}catch{setMessage('No se pudo copiar.');}}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold text-white"><ClipboardCopy size={18}/>Copiar</button><button type="button" onClick={()=>{setValues({imei1:'',imei2:'',sn:''});setField('imei1');setMessage('');}} className="inline-flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold"><RotateCcw size={18}/>Limpiar</button></div></div></section><Link href="/inventario/registrar" className="block rounded-xl border border-blue-600 p-3 text-center font-semibold text-blue-700">Ir al registro OCR / manual</Link></main>;
}
