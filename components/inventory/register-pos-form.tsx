
'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Keyboard,
  LoaderCircle,
  PackagePlus,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';

import ScannerOcr from '@/components/scanner/scanner-ocr';

import {
  isValidImei,
  type SunmiLabelData,
} from '@/lib/utils/parse-sunmi-label';

type ModelOption =
  | ''
  | 'V2s / T5940'
  | 'V2 PRO / T5921';

type EntryMode = 'ocr' | 'manual';

type DeviceForm = {
  brand: string;
  model: ModelOption;
  serialNumber: string;
  imei: string;
  imei2: string;
  notes: string;
};

type DuplicateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'duplicate'
  | 'error';

type DuplicateCheck = {
  status: DuplicateStatus;
  fingerprint: string;
  message: string;
  internalCode?: string;
};

type SavedDevice = {
  internalCode: string;
  model: string;
  serialNumber: string;
};

const initialForm: DeviceForm = {
  brand: 'SUNMI',
  model: '',
  serialNumber: '',
  imei: '',
  imei2: '',
  notes: '',
};

function normalizeModel(value: string): ModelOption {
  const text = value.toUpperCase();

  if (text.includes('T5940') || text.includes('V2S')) {
    return 'V2s / T5940';
  }

  if (
    text.includes('T5921') ||
    text.includes('V2 PRO')
  ) {
    return 'V2 PRO / T5921';
  }

  return '';
}

function fingerprintOf(form: DeviceForm): string {
  return JSON.stringify({
    model: form.model,
    serialNumber: form.serialNumber,
    imei: form.imei,
    imei2: form.imei2,
  });
}

function emptyCheck(): DuplicateCheck {
  return {
    status: 'idle',
    fingerprint: '',
    message: '',
  };
}

function normalizeSerial(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 100);
}

export default function RegisterPosForm() {
  const router = useRouter();

  const [mode, setMode] = useState<EntryMode>('ocr');
  const [form, setForm] = useState<DeviceForm>(
    initialForm,
  );

  const [duplicateCheck, setDuplicateCheck] =
    useState<DuplicateCheck>(emptyCheck);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedDevice, setSavedDevice] =
    useState<SavedDevice | null>(null);

  // Evita procesar dos registros simultáneos.
  const savingRef = useRef(false);

  const isV2s = form.model === 'V2s / T5940';
  const isV2Pro = form.model === 'V2 PRO / T5921';

  const imei1Valid = isValidImei(form.imei);

  const imei2Valid = isV2s
    ? isValidImei(form.imei2)
    : !form.imei2 || isValidImei(form.imei2);

  const serialValid =
    /^[A-Z0-9-]{6,100}$/.test(form.serialNumber);

  const differentImeis =
    !form.imei2 || form.imei !== form.imei2;

  const valid =
    (isV2s || isV2Pro) &&
    imei1Valid &&
    imei2Valid &&
    serialValid &&
    differentImeis;

  const fingerprint = fingerprintOf(form);

  // Solo aceptamos una verificación hecha
  // sobre los valores que actualmente están escritos.
  const duplicateAvailable =
    duplicateCheck.status === 'available' &&
    duplicateCheck.fingerprint === fingerprint;

  const canSave =
    valid &&
    duplicateAvailable &&
    !saving;

  function updateField(
    field: keyof DeviceForm,
    value: string,
  ) {
    if (savingRef.current) return;

    setError('');

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    if (savingRef.current) return;

    setForm({ ...initialForm });
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
      model: normalizeModel(data.model),
      serialNumber: normalizeSerial(
        data.serialNumber,
      ),
      imei: data.imei.replace(/\D/g, '').slice(0, 15),
      imei2: data.imei2.replace(/\D/g, '').slice(0, 15),
      notes: '',
    });
  }

  // -------------------------------------------
  // VERIFICACIÓN AUTOMÁTICA DE DUPLICADOS
  // -------------------------------------------

  useEffect(() => {
    if (!valid || savingRef.current) {
      return;
    }

    const controller = new AbortController();

    // Espera breve para evitar una petición
    // por cada carácter introducido manualmente.
    const timer = window.setTimeout(async () => {
      setDuplicateCheck({
        status: 'checking',
        fingerprint,
        message: 'Consultando duplicados en el inventario...',
      });

      try {
        const params = new URLSearchParams({
          serial: form.serialNumber,
          imei: form.imei,
        });

        if (form.imei2) {
          params.set('imei2', form.imei2);
        }

        const response = await fetch(
          `/api/devices?${params.toString()}`,
          {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (controller.signal.aborted) return;

        if (!response.ok) {
          throw new Error(
            typeof result.error === 'string'
              ? result.error
              : 'No se pudo verificar el inventario.',
          );
        }

        if (result.exists) {
          setDuplicateCheck({
            status: 'duplicate',
            fingerprint,
            message:
              'Este S/N o alguno de los IMEI ya está registrado.',
            internalCode:
              result.device?.internalCode ?? undefined,
          });

          return;
        }

        setDuplicateCheck({
          status: 'available',
          fingerprint,
          message:
            'Identificadores disponibles. Puedes registrar el POS.',
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        setDuplicateCheck({
          status: 'error',
          fingerprint,
          message:
            err instanceof Error
              ? err.message
              : 'Error al verificar duplicados.',
        });
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    valid,
    fingerprint,
    form.serialNumber,
    form.imei,
    form.imei2,
  ]);

  // Un resultado anterior nunca habilita el botón
  // si el usuario ya modificó los identificadores.
  const currentCheck =
    duplicateCheck.fingerprint === fingerprint
      ? duplicateCheck
      : emptyCheck();

  // -------------------------------------------
  // REGISTRO DEL DISPOSITIVO
  // -------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSave || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setError('');

    const submittedForm = { ...form };

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand: 'SUNMI',
          model: submittedForm.model,
          serialNumber: submittedForm.serialNumber,
          imei: submittedForm.imei,
          imei2: submittedForm.imei2,
          notes: submittedForm.notes.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : 'No se pudo registrar el dispositivo.',
        );
      }

      const internalCode =
        result.device?.internalCode;

      if (
        typeof internalCode !== 'string' ||
        !internalCode
      ) {
        throw new Error(
          'El servidor no devolvió el código interno. ' +
          'Revisa el inventario antes de reintentar.',
        );
      }

      setSavedDevice({
        internalCode,
        model: submittedForm.model,
        serialNumber: submittedForm.serialNumber,
      });

      setForm({ ...initialForm });
      setDuplicateCheck(emptyCheck());

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al registrar el dispositivo.',
      );

      // En caso de conflicto, bloquear el envío
      // hasta una nueva comprobación.
      setDuplicateCheck(emptyCheck());
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function closeSuccess() {
    setSavedDevice(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <Link
            href="/inventario"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"
          >
            <ArrowLeft size={18} />
            Volver al inventario
          </Link>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              INVENTARIO POS
            </p>

            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              Registrar dispositivo POS
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Selecciona el método de registro para
              dispositivos SUNMI.
            </p>
          </div>
        </header>

        {/* SELECCIÓN DEL MÉTODO */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => changeMode('ocr')}
            aria-pressed={mode === 'ocr'}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold transition ${
              mode === 'ocr'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            <Camera size={20} />
            Registro con OCR
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => changeMode('manual')}
            aria-pressed={mode === 'manual'}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold transition ${
              mode === 'manual'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            <Keyboard size={20} />
            Registro manual
          </button>
        </div>

        {mode === 'ocr' && (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Camera size={22} className="text-blue-600" />
              Fotografía de etiqueta SUNMI
            </h2>

            <p className="text-sm text-slate-500">
              El OCR realizará dos lecturas y mostrará
              un modal para revisar los identificadores.
            </p>

            <ScannerOcr onExtract={handleOcr} />
          </section>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div>
            <h2 className="text-lg font-bold">
              {mode === 'ocr'
                ? 'Datos detectados por OCR'
                : 'Introducir datos manualmente'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {mode === 'ocr'
                ? 'Confirma o corrige los valores de la fotografía.'
                : 'Escribe los datos tal como aparecen en la etiqueta.'}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="brand"
              className="block text-sm font-semibold"
            >
              Marca
            </label>

            <input
              id="brand"
              value="SUNMI"
              readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-base"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="model"
              className="block text-sm font-semibold"
            >
              Modelo *
            </label>

            <select
              id="model"
              required
              disabled={saving}
              value={form.model}
              onChange={(event) =>
                updateField('model', event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base"
            >
              <option value="">Selecciona un modelo</option>
              <option value="V2s / T5940">
                SUNMI V2s — T5940
              </option>
              <option value="V2 PRO / T5921">
                SUNMI V2 PRO — T5921
              </option>
            </select>
          </div>

          {form.model && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              {isV2s
                ? 'V2s requiere S/N, IMEI 1 e IMEI 2.'
                : 'V2 PRO requiere S/N e IMEI 1. IMEI 2 es opcional.'}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="serialNumber"
              className="block text-sm font-semibold"
            >
              S/N — Número de serie *
            </label>

            <input
              id="serialNumber"
              required
              autoComplete="off"
              maxLength={100}
              disabled={saving}
              value={form.serialNumber}
              onChange={(event) =>
                updateField(
                  'serialNumber',
                  normalizeSerial(event.target.value),
                )
              }
              placeholder="Número de serie del POS"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base"
            />

            {form.serialNumber && !serialValid && (
              <p className="text-xs text-amber-700">
                El S/N debe tener entre 6 y 100 caracteres.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="imei"
              className="block text-sm font-semibold"
            >
              IMEI 1 *
            </label>

            <input
              id="imei"
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={15}
              disabled={saving}
              value={form.imei}
              onChange={(event) =>
                updateField(
                  'imei',
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 15),
                )
              }
              placeholder="15 dígitos"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base"
            />

            {form.imei && !imei1Valid && (
              <p className="text-xs text-amber-700">
                Revisa el IMEI 1: debe tener 15 dígitos
                y superar la validación Luhn.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="imei2"
              className="block text-sm font-semibold"
            >
              IMEI 2 {isV2s ? '*' : '(opcional)'}
            </label>

            <input
              id="imei2"
              required={isV2s}
              inputMode="numeric"
              autoComplete="off"
              maxLength={15}
              disabled={saving}
              value={form.imei2}
              onChange={(event) =>
                updateField(
                  'imei2',
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 15),
                )
              }
              placeholder="Segundo IMEI, si corresponde"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base"
            />

            {form.imei2 && !imei2Valid && (
              <p className="text-xs text-amber-700">
                Revisa el IMEI 2 y su dígito de control.
              </p>
            )}

            {!differentImeis && (
              <p className="text-xs font-semibold text-red-600">
                Los dos IMEI no pueden ser iguales.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="block text-sm font-semibold"
            >
              Observaciones
            </label>

            <textarea
              id="notes"
              rows={3}
              maxLength={1000}
              disabled={saving}
              value={form.notes}
              onChange={(event) =>
                updateField('notes', event.target.value)
              }
              placeholder="Observaciones opcionales"
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-base"
            />
          </div>

          {/* COMPROBACIÓN AUTOMÁTICA */}
          <div className="space-y-2 border-t border-slate-200 pt-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={20} />
              Verificación automática
            </h3>

            {!valid && (
              <p className="text-sm text-slate-500">
                Completa los campos obligatorios para
                comprobar duplicados automáticamente.
              </p>
            )}

            {valid && currentCheck.status === 'idle' && (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                Preparando verificación...
              </p>
            )}

            {currentCheck.status === 'checking' && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-blue-700"
              >
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                {currentCheck.message}
              </p>
            )}

            {currentCheck.status === 'available' && (
              <p
                role="status"
                className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800"
              >
                <CheckCircle2 size={19} />
                {currentCheck.message}
              </p>
            )}

            {currentCheck.status === 'duplicate' && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <p className="flex items-center gap-2 font-semibold">
                  <AlertCircle size={19} />
                  Dispositivo duplicado
                </p>

                <p className="mt-2">
                  {currentCheck.message}
                </p>

                {currentCheck.internalCode && (
                  <p className="mt-2 font-mono">
                    Código: {currentCheck.internalCode}
                  </p>
                )}
              </div>
            )}

            {currentCheck.status === 'error' && (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                No se pudo verificar el dispositivo:
                {' '}{currentCheck.message}
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle
                size={19}
                className="shrink-0"
              />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <LoaderCircle
                  size={20}
                  className="animate-spin"
                />
                Registrando POS...
              </>
            ) : (
              <>
                <PackagePlus size={20} />
                Registrar POS
              </>
            )}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={resetForm}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw size={18} />
            Limpiar formulario
          </button>
        </form>
      </div>

      {/* MODAL DE REGISTRO EXITOSO */}
      {savedDevice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={closeSuccess}
                aria-label="Cerrar confirmación"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2
                size={46}
                className="text-green-600"
              />
            </div>

            <h2
              id="success-title"
              className="mt-5 text-2xl font-bold text-slate-900"
            >
              ¡POS registrado correctamente!
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              El equipo fue registrado en el inventario
              y se generó su entrada al almacén.
            </p>

            <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-left">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Código interno
              </p>

              <p className="break-all font-mono text-sm font-bold text-blue-700">
                {savedDevice.internalCode}
              </p>

              <p className="pt-2 text-sm text-slate-700">
                <strong>Modelo:</strong>{' '}
                {savedDevice.model}
              </p>

              <p className="break-all text-sm text-slate-700">
                <strong>S/N:</strong>{' '}
                {savedDevice.serialNumber}
              </p>
            </div>

            <button
              type="button"
              onClick={closeSuccess}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <ClipboardCheck size={19} />
              Registrar otro POS
            </button>

            <Link
              href="/inventario"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ir al inventario
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
