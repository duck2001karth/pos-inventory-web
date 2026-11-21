'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, Camera, CheckCircle2, ClipboardCheck,
  Images, Keyboard, LoaderCircle, PackagePlus, RotateCcw,
  ShieldCheck, X,
} from 'lucide-react';

import ScannerOcr from '@/components/scanner/scanner-ocr';
import { isValidImei, type SunmiLabelData } from '@/lib/utils/parse-sunmi-label';

type ModelOption = '' | 'V2s / T5940' | 'V2 PRO / T5921';
type EntryMode = 'ocr' | 'manual';

type DeviceForm = {
  brand: 'SUNMI';
  model: ModelOption;
  serialNumber: string;
  imei: string;
  imei2: string;
  notes: string;
};

type DuplicateCheck = {
  status: 'idle' | 'checking' | 'available' | 'duplicate' | 'error';
  fingerprint: string;
  message: string;
  internalCode?: string;
};

type SavedDevice = {
  internalCode: string;
  model: string;
  serialNumber: string;
};

const initialForm = (): DeviceForm => ({
  brand: 'SUNMI', model: '', serialNumber: '', imei: '', imei2: '', notes: '',
});
const emptyCheck = (): DuplicateCheck => ({ status: 'idle', fingerprint: '', message: '' });

function normalizeModel(value: string): ModelOption {
  const text = value.toUpperCase();
  if (text.includes('T5940') || text.includes('V2S')) return 'V2s / T5940';
  if (text.includes('T5921') || text.includes('V2 PRO')) return 'V2 PRO / T5921';
  return '';
}

function normalizeSerial(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 100);
}

// Solo estos campos afectan a la verificación de duplicados.
// Nunca incluir notes: modificar una observación no debe bloquear el registro.
function fingerprintOf(form: DeviceForm): string {
  return JSON.stringify({
    model: form.model, serialNumber: form.serialNumber,
    imei: form.imei, imei2: form.imei2,
  });
}

const labelClass = 'block text-sm font-semibold text-[var(--app-fg)]';
const fieldClass = 'app-field w-full text-base outline-none';

export default function RegisterPosForm() {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>('ocr');
  const [form, setForm] = useState<DeviceForm>(initialForm);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck>(emptyCheck);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedDevice, setSavedDevice] = useState<SavedDevice | null>(null);
  const savingRef = useRef(false);
  const successCloseRef = useRef<HTMLButtonElement>(null);

  const isV2s = form.model === 'V2s / T5940';
  const imei1Valid = isValidImei(form.imei);
  const imei2Valid = isV2s ? isValidImei(form.imei2) : (!form.imei2 || isValidImei(form.imei2));
  const serialValid = /^[A-Z0-9-]{6,100}$/.test(form.serialNumber);
  const differentImeis = !form.imei2 || form.imei !== form.imei2;
  const valid = Boolean(form.model) && imei1Valid && imei2Valid && serialValid && differentImeis;
  const fingerprint = fingerprintOf(form);
  const currentCheck = duplicateCheck.fingerprint === fingerprint ? duplicateCheck : emptyCheck();
  const canSave = valid && currentCheck.status === 'available' && !saving;

  function updateField(field: keyof DeviceForm, value: string) {
    if (savingRef.current) return;
    setError('');
    // CORRECCIÓN: notes y brand no alteran la identidad del dispositivo.
    if (field !== 'notes' && field !== 'brand') {
      setDuplicateCheck(emptyCheck());
    }
    setForm(previous => ({ ...previous, [field]: value }));
  }

  function resetForm() {
    if (savingRef.current) return;
    setForm(initialForm());
    setDuplicateCheck(emptyCheck());
    setError('');
  }

  function changeMode(next: EntryMode) {
    if (savingRef.current || next === mode) return;
    setMode(next);
    resetForm();
  }

  function handleOcr(data: SunmiLabelData) {
    if (savingRef.current) return;
    setError('');
    setDuplicateCheck(emptyCheck());
    setForm({
      brand: 'SUNMI',
      model: normalizeModel(data.model || ''),
      serialNumber: normalizeSerial(data.serialNumber || ''),
      imei: (data.imei || '').replace(/\D/g, '').slice(0, 15),
      imei2: (data.imei2 || '').replace(/\D/g, '').slice(0, 15),
      notes: '',
    });
  }

  // Comprobación automática con debounce. Las observaciones no son dependencia.
  useEffect(() => {
    if (!valid || savingRef.current) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDuplicateCheck({ status: 'checking', fingerprint, message: 'Consultando el inventario...' });
      try {
        const params = new URLSearchParams({ serial: form.serialNumber, imei: form.imei });
        if (form.imei2) params.set('imei2', form.imei2);
        const response = await fetch(`/api/devices?${params}`, {
          cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
        });
        const result: { exists?: boolean; device?: { internalCode?: string }; error?: string } = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(result.error || 'No se pudo verificar el inventario.');
        if (result.exists) {
          setDuplicateCheck({
            status: 'duplicate', fingerprint,
            message: 'El S/N o alguno de los IMEI ya está registrado.',
            internalCode: result.device?.internalCode,
          });
        } else {
          setDuplicateCheck({
            status: 'available', fingerprint,
            message: 'Identificadores disponibles. El equipo puede registrarse.',
          });
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setDuplicateCheck({
          status: 'error', fingerprint,
          message: cause instanceof Error ? cause.message : 'Error de verificación.',
        });
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [valid, fingerprint, form.serialNumber, form.imei, form.imei2]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    const submitted = { ...form };

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: 'SUNMI', model: submitted.model,
          serialNumber: submitted.serialNumber,
          imei: submitted.imei, imei2: submitted.imei2,
          notes: submitted.notes.trim(),
        }),
      });
      const result: { error?: string; device?: { internalCode?: string } } = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar el dispositivo.');
      const code = result.device?.internalCode;
      if (!code) throw new Error('El servidor no devolvió el código interno. Revisa el inventario antes de repetir el registro.');

      setSavedDevice({ internalCode: code, model: submitted.model, serialNumber: submitted.serialNumber });
      setForm(initialForm());
      setDuplicateCheck(emptyCheck());
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error de conexión al registrar.');
      setDuplicateCheck(emptyCheck());
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!savedDevice) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    successCloseRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSavedDevice(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [savedDevice]);

  return (
    <main className="w-full min-w-0 px-3 py-5 text-[var(--app-fg)] sm:px-5 sm:py-6 lg:px-6 xl:px-8 2xl:px-10">
      <div className="w-full min-w-0 space-y-5">
        <header className="space-y-3">
          <Link href="/inventario" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-accent)] hover:underline">
            <ArrowLeft size={18} /> Volver al inventario
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--app-accent)]">Inventario POS</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Registrar dispositivo POS</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">Fotografía la etiqueta SUNMI, introduce los datos manualmente o procesa varias fotos por lotes.</p>
          </div>
        </header>

        <div role="group" aria-label="Método de registro" className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <button type="button" disabled={saving} aria-pressed={mode === 'ocr'} onClick={() => changeMode('ocr')}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-semibold transition disabled:opacity-50 sm:px-4 ${mode === 'ocr'
              ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-fg)] hover:bg-[var(--app-hover)]'}`}>
            <Camera size={19} /> Registro con OCR
          </button>
          <button type="button" disabled={saving} aria-pressed={mode === 'manual'} onClick={() => changeMode('manual')}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-semibold transition disabled:opacity-50 sm:px-4 ${mode === 'manual'
              ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-fg)] hover:bg-[var(--app-hover)]'}`}>
            <Keyboard size={19} /> Registro manual
          </button>
          <Link href="/inventario/registrar/lotes" aria-label="Abrir OCR por lotes"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--app-accent)] transition hover:opacity-85">
            <Images size={19} /> OCR por lotes
          </Link>
        </div>

        <div className={mode === 'ocr'
          ? 'grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-5'
          : 'mx-auto w-full max-w-5xl'}>
          {mode === 'ocr' && (
            <section className="app-panel corporate-ocr min-w-0 space-y-3 p-4 sm:p-5 xl:sticky xl:top-[86px]">
              <div className="flex items-center gap-2">
                <Camera size={22} className="text-[var(--app-accent)]" />
                <h2 className="text-lg font-bold">Fotografía de etiqueta SUNMI</h2>
              </div>
              <p className="text-sm leading-6 text-[var(--app-muted)]">Toma una fotografía y compara los identificadores en el modal OCR antes de registrar.</p>
              <ScannerOcr onExtract={handleOcr} />
            </section>
          )}

          <form onSubmit={handleSubmit} className="app-panel min-w-0 space-y-5 p-4 sm:p-5 xl:p-6">
            <div>
              <h2 className="text-lg font-bold">{mode === 'ocr' ? 'Datos detectados por OCR' : 'Introducir datos manualmente'}</h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">{mode === 'ocr' ? 'Verifica y corrige los datos extraídos.' : 'Escribe los datos como aparecen en la etiqueta física.'}</p>
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label htmlFor="brand" className={labelClass}>Marca</label>
                <input id="brand" readOnly value="SUNMI" className={`${fieldClass} bg-[var(--app-hover)]`} />
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor="model" className={labelClass}>Modelo *</label>
                <select id="model" required disabled={saving} value={form.model} onChange={event => updateField('model', event.target.value)} className={fieldClass}>
                  <option value="">Selecciona un modelo</option>
                  <option value="V2s / T5940">SUNMI V2s — T5940</option>
                  <option value="V2 PRO / T5921">SUNMI V2 PRO — T5921</option>
                </select>
              </div>
            </div>
            {form.model && (
              <p className="rounded-xl border border-[var(--app-border)] bg-[var(--app-accent-soft)] p-3 text-sm leading-6 text-[var(--app-fg)]">
                {isV2s ? 'V2s requiere S/N, IMEI 1 e IMEI 2.' : 'V2 PRO requiere S/N e IMEI 1; IMEI 2 es opcional.'}
              </p>
            )}
            <div className="space-y-2">
              <label htmlFor="serialNumber" className={labelClass}>S/N — Número de serie *</label>
              <input id="serialNumber" required autoComplete="off" maxLength={100} disabled={saving}
                value={form.serialNumber} onChange={event => updateField('serialNumber', normalizeSerial(event.target.value))}
                placeholder="Número de serie del POS" className={`${fieldClass} font-mono`} />
              {form.serialNumber && !serialValid && <p className="text-xs text-amber-600">El S/N debe tener entre 6 y 100 caracteres alfanuméricos.</p>}
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label htmlFor="imei" className={labelClass}>IMEI 1 *</label>
                <input id="imei" required inputMode="numeric" autoComplete="off" maxLength={15} disabled={saving}
                  value={form.imei} onChange={event => updateField('imei', event.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="15 dígitos" className={`${fieldClass} font-mono`} />
                {form.imei && !imei1Valid && <p className="text-xs text-amber-600">Verifica los 15 dígitos y el control Luhn.</p>}
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor="imei2" className={labelClass}>IMEI 2 {isV2s ? '*' : '(opcional)'}</label>
                <input id="imei2" required={isV2s} inputMode="numeric" autoComplete="off" maxLength={15} disabled={saving}
                  value={form.imei2} onChange={event => updateField('imei2', event.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="Segundo IMEI, si corresponde" className={`${fieldClass} font-mono`} />
                {form.imei2 && !imei2Valid && <p className="text-xs text-amber-600">Revisa el IMEI 2 y su dígito de control.</p>}
                {!differentImeis && <p className="text-xs font-semibold text-red-600">Ambos IMEI deben ser diferentes.</p>}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className={labelClass}>Observaciones</label>
              <textarea id="notes" rows={3} maxLength={1000} disabled={saving} value={form.notes}
                onChange={event => updateField('notes', event.target.value)} placeholder="Observaciones opcionales" className={`${fieldClass} resize-y`} />
            </div>

            <div className="space-y-3 border-t border-[var(--app-border)] pt-5">
              <h3 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={19} className="text-[var(--app-accent)]" /> Verificación automática</h3>
              {!valid && <p className="text-sm text-[var(--app-muted)]">Completa los campos obligatorios para comprobar duplicados.</p>}
              {valid && currentCheck.status === 'idle' && <p role="status" className="flex items-center gap-2 text-sm text-[var(--app-muted)]"><LoaderCircle size={17} className="animate-spin" /> Preparando verificación...</p>}
              {currentCheck.status === 'checking' && <p role="status" className="flex items-center gap-2 text-sm text-[var(--app-accent)]"><LoaderCircle size={17} className="animate-spin" />{currentCheck.message}</p>}
              {currentCheck.status === 'available' && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600"><CheckCircle2 size={19} />{currentCheck.message}</p>}
              {currentCheck.status === 'duplicate' && (
                <div role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
                  <p className="flex items-center gap-2 font-semibold"><AlertCircle size={18} /> Dispositivo duplicado</p>
                  <p className="mt-2">{currentCheck.message}</p>
                  {currentCheck.internalCode && <p className="mt-1 break-all font-mono text-xs">Código: {currentCheck.internalCode}</p>}
                </div>
              )}
              {currentCheck.status === 'error' && <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600">{currentCheck.message}</p>}
            </div>
            {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-600"><AlertCircle size={18} className="shrink-0" />{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="submit" disabled={!canSave} className="app-primary min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-40">
                {saving ? <><LoaderCircle size={20} className="animate-spin" /> Registrando POS...</> : <><PackagePlus size={20} /> Registrar POS</>}
              </button>
              <button type="button" disabled={saving} onClick={resetForm}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm font-semibold transition hover:bg-[var(--app-hover)] disabled:opacity-40">
                <RotateCcw size={18} /> Limpiar formulario
              </button>
            </div>
          </form>
        </div>
      </div>

      {savedDevice && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-3 sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="registration-success-title" className="app-panel w-full max-w-md p-5 text-center shadow-2xl sm:p-7">
            <div className="flex justify-end">
              <button ref={successCloseRef} type="button" onClick={() => setSavedDevice(null)} aria-label="Cerrar confirmación" className="app-icon-button"><X size={20} /></button>
            </div>
            <span className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle2 size={39} /></span>
            <h2 id="registration-success-title" className="mt-4 text-xl font-bold">¡POS registrado correctamente!</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">El equipo fue registrado en el inventario y se generó su entrada al almacén.</p>
            <div className="mt-5 space-y-2 rounded-xl bg-[var(--app-hover)] p-4 text-left text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Código interno</p>
              <p className="break-all font-mono font-bold text-[var(--app-accent)]">{savedDevice.internalCode}</p>
              <p><strong>Modelo:</strong> {savedDevice.model}</p>
              <p className="break-all"><strong>S/N:</strong> {savedDevice.serialNumber}</p>
            </div>
            <button type="button" onClick={() => setSavedDevice(null)} className="app-primary mt-5 w-full"><ClipboardCheck size={18} /> Registrar otro POS</button>
            <Link href="/inventario" className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--app-border)] text-sm font-semibold hover:bg-[var(--app-hover)]">Ir al inventario</Link>
          </div>
        </div>
      )}
    </main>
  );
}
