'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, ScanText } from 'lucide-react';
import type { SunmiLabelData } from '@/lib/utils/parse-sunmi-label';
import OcrCapture from './ocr-capture';
import OcrConfirmModal from './ocr-confirm-modal';
import { recognizeSunmiLabel } from './recognize-label';
import type { OcrIssues } from './ocr-read-status';

const empty:SunmiLabelData={imei:'',imei2:'',serialNumber:'',brand:'',model:'',meid:''};
export default function ScannerOcr({onExtract}:{onExtract:(data:SunmiLabelData)=>void}) {
  const busy=useRef(false);const mounted=useRef(true);const urlRef=useRef('');
  const [loading,setLoading]=useState(false);const [progress,setProgress]=useState(0);const [status,setStatus]=useState('');
  const [error,setError]=useState('');const [success,setSuccess]=useState('');const [imageUrl,setImageUrl]=useState('');
  const [data,setData]=useState<SunmiLabelData>(empty);const [issues,setIssues]=useState<OcrIssues>({});const [modal,setModal]=useState(false);
  const [raw,setRaw]=useState('');const [showRaw,setShowRaw]=useState(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(urlRef.current)URL.revokeObjectURL(urlRef.current);};},[]);
  async function process(file:File){if(busy.current)return;busy.current=true;setLoading(true);setError('');setSuccess('');setProgress(0);setShowRaw(false);
    try{if(!file.type.startsWith('image/'))throw new Error('Selecciona una fotografía válida.');if(file.size>12*1024*1024)throw new Error('La fotografía supera 12 MB.');
      const result=await recognizeSunmiLabel(file,(value,message)=>{if(mounted.current){setProgress(value);setStatus(message);}});
      if(!mounted.current)return;const nextUrl=URL.createObjectURL(file);if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current=nextUrl;setImageUrl(nextUrl);setData(result.data);setIssues(result.issues);setRaw(result.rawText);setModal(true);
    }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo interpretar la etiqueta.');}finally{busy.current=false;if(mounted.current)setLoading(false);}}
  return <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4"><div className="flex items-start gap-3"><ScanText className="mt-1 text-blue-600"/><div><h2 className="font-semibold">Reconocimiento SUNMI</h2><p className="text-sm text-slate-600">Captura la etiqueta completa; dos lecturas ayudan a detectar discrepancias.</p></div></div><OcrCapture disabled={loading} onImage={file=>void process(file)}/>{loading&&<div role="status" className="space-y-2 rounded-xl bg-white p-3 text-sm"><p className="flex items-center gap-2"><LoaderCircle size={18} className="animate-spin"/>{status}</p><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600" style={{width:`${progress}%`}}/></div><p>{progress}%</p></div>}{error&&<p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={18}/>{error}</p>}{success&&<p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 size={18}/>{success}</p>}{raw&&<div><button type="button" onClick={()=>setShowRaw(x=>!x)} className="text-sm font-semibold text-blue-700 underline">{showRaw?'Ocultar lecturas':'Ver lecturas OCR'}</button>{showRaw&&<pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-white p-3 text-xs">{raw}</pre>}</div>}<p className="text-xs text-slate-500">La foto se procesa en el navegador. Confirma siempre los identificadores antes del registro.</p><OcrConfirmModal open={modal} initialData={data} imageUrl={imageUrl} issues={issues} onCancel={()=>setModal(false)} onConfirm={confirmed=>{onExtract(confirmed);setModal(false);setSuccess('Datos revisados. La comprobación de duplicados ocurre en el formulario.');}}/></section>;
}
