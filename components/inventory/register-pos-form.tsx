
'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  PackagePlus,
  RotateCcw,
  ShieldCheck,
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

type ExistingDevice = {
  id: string;
  internalCode: string;
  serialNumber: string | null;
  status: string;
  model: {
    brand: string;
    model: string;
  };
};

type DeviceForm = {
  imei: string;
  imei2: string;
  serialNumber: string;
  brand: string;
  model: ModelOption;
  notes: string;
};

const initialForm: DeviceForm = {
  imei: '',
  imei2: '',
  serialNumber: '',
  brand: 'SUNMI',
  model: '',
  notes: '',
};

function normalizeModel(value: string): ModelOption {
  const normalized = value.toUpperCase();

  if (
    normalized.includes('T5940') ||
    normalized.includes('V2S')
  ) {
    return 'V2s / T5940';
  }

  if (
    normalized.includes('T5921') ||
    normalized.includes('V2 PRO')
  ) {
    return 'V2 PRO / T5921';
  }

  return '';
}

function normalizeSerial(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s/g, '')
    .slice(0, 100);
}

function createFingerprint(form: DeviceForm): string {
  return JSON.stringify({
    imei: form.imei.trim(),
    imei2: form.imei2.trim(),
    serialNumber: form.serialNumber.trim(),
    brand: form.brand.trim(),
    model: form.model,
  });
}

export default function RegisterPosForm() {
  const router = useRouter();

  const [form, setForm] = useState<DeviceForm>({
    ...initialForm,
  });

  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [existing, setExisting] =
    useState<ExistingDevice | null>(null);

  const [verifiedFingerprint, setVerifiedFingerprint] =
    useState('');

  const [reviewed, setReviewed] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registeredCode, setRegisteredCode] = useState('');

  function invalidateVerification() {
    setVerifiedFingerprint('');
    setReviewed(false);
    setExisting(null);
    setError('');
    setMessage('');
    setRegisteredCode('');
  }

  function updateForm(
    field: keyof DeviceForm,
    value: string,
  ) {
    if (checking || saving) return;

    invalidateVerification();

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleOcr(data: SunmiLabelData) {
    if (checking || saving) return;

    invalidateVerification();

    const detectedModel = normalizeModel(data.model);

    setForm((previous) => ({
      ...previous,
      imei: data.imei || '',
      imei2: data.imei2 || '',
      serialNumber: normalizeSerial(
        data.serialNumber || '',
      ),
      brand: data.brand?.trim().toUpperCase() || 'SUNMI',
      model: detectedModel,
      notes: previous.notes,
    }));

    setMessage(
      'Datos recibidos desde OCR. Verifica el modelo, ' +
      'los IMEI y el S/N antes de registrar.',
    );
  }

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

  const brandValid =
    form.brand.trim().toUpperCase() === 'SUNMI';

  const modelValid = isV2s || isV2Pro;

  const valid =
    modelValid &&
    imei1Valid &&
    imei2Valid &&
    serialValid &&
    differentImeis &&
    brandValid;

  const fingerprint = createFingerprint(form);

  const duplicatesVerified =
    verifiedFingerprint === fingerprint &&
    !existing;

  const canSave =
    valid &&
    reviewed &&
    duplicatesVerified &&
    !checking &&
    !saving;

  async function checkDuplicates() {
    if (!valid || checking || saving) return;

    const requestedFingerprint = fingerprint;

    setChecking(true);
    setError('');
    setMessage('');
    setExisting(null);
    setVerifiedFingerprint('');

    try {
      const params = new URLSearchParams({
        serial: form.serialNumber.trim(),
        imei: form.imei.trim(),
      });

      if (form.imei2.trim()) {
        params.set('imei2', form.imei2.trim());
      }

      const response = await fetch(
        `/api/devices?${params.toString()}`,
        {
          credentials: 'same-origin',
          cache: 'no-store',
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            'No se pudo comprobar el dispositivo.',
        );
      }

      if (requestedFingerprint !== createFingerprint(form)) {
        return;
      }

      if (result.exists) {
        setExisting(result.device);

        setError(
          'Uno de los identificadores ya está ' +
          'registrado en el inventario.',
        );

        return;
      }

      setVerifiedFingerprint(requestedFingerprint);

      setMessage(
        'No se encontraron duplicados. ' +
        'Puedes confirmar el registro.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexión al comprobar duplicados.',
      );
    } finally {
      setChecking(false);
    }
  }

  async function saveDevice(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSave) {
      setError(
        'Revisa los datos, confirma la etiqueta ' +
        'y comprueba duplicados antes de registrar.',
      );

      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    setRegisteredCode('');

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          serialNumber: form.serialNumber.trim(),
          imei: form.imei.trim(),
          imei2: form.imei2.trim(),
          brand: 'SUNMI',
          model: form.model,
          notes: form.notes.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setVerifiedFingerprint('');
        }

        throw new Error(
          result.error ??
            'No se pudo registrar el dispositivo.',
        );
      }

      const internalCode: string =
        result.device.internalCode;

      setRegisteredCode(internalCode);

      setMessage(
        'Dispositivo registrado correctamente. ' +
        'Se generó su entrada al almacén.',
      );

      setForm({ ...initialForm });
      setExisting(null);
      setVerifiedFingerprint('');
      setReviewed(false);

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexión al guardar el POS.',
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    if (checking || saving) return;

    setForm({ ...initialForm });
    invalidateVerification();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <Link
            href="/inventario"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={17} />
            Volver al inventario
          </Link>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              INVENTARIO POS
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Registrar dispositivo POS
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Registra equipos SUNMI mediante una fotografía
              de su etiqueta o introduciendo manualmente
              sus identificadores.
            </p>
          </div>
        </header>

        {registeredCode && (
          <div
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 p-5"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={24}
                className="shrink-0 text-green-600"
              />

              <div className="min-w-0">
                <p className="font-bold text-green-900">
                  Registro completado
                </p>

                <p className="mt-1 text-sm text-green-800">
                  Código interno generado:
                </p>

                <p className="mt-2 break-all font-mono text-sm font-semibold text-green-900">
                  {registeredCode}
                </p>

                <Link
                  href="/inventario"
                  className="mt-3 inline-block text-sm font-semibold text-green-800 underline"
                >
                  Ver inventario actualizado
                </Link>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={saveDevice}
          className="space-y-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          {/* SECCIÓN 1: OCR */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Camera size={23} />
              </div>

              <div>
                <h2 className="text-lg font-bold">
                  1. Captura de datos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Fotografía la etiqueta completa del SUNMI
                  o continúa con el registro manual.
                </p>
              </div>
            </div>

            <ScannerOcr onExtract={handleOcr} />

            <p className="text-xs text-slate-500">
              El OCR intenta detectar automáticamente
              el modelo, IMEI y número de serie.
              Todos los datos deben revisarse antes de guardar.
            </p>
          </section>

          {/* SECCIÓN 2: IDENTIFICACIÓN */}
          <section className="space-y-5 border-t border-slate-200 pt-6">
            <div>
              <h2 className="text-lg font-bold">
                2. Identificación del equipo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Selecciona el modelo correcto indicado
                en la etiqueta del fabricante.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="device-brand"
                className="block text-sm font-semibold"
              >
                Marca
              </label>

              <input
                id="device-brand"
                value={form.brand}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="device-model"
                className="block text-sm font-semibold"
              >
                Modelo *
              </label>

              <select
                id="device-model"
                required
                disabled={checking || saving}
                value={form.model}
                onChange={(event) =>
                  updateForm('model', event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-600"
              >
                <option value="">
                  Selecciona el modelo
                </option>

                <option value="V2s / T5940">
                  SUNMI V2s — T5940
                </option>

                <option value="V2 PRO / T5921">
                  SUNMI V2 PRO — T5921
                </option>
              </select>
            </div>

            {isV2s && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Este modelo requiere S/N, IMEI 1 e IMEI 2.
              </div>
            )}

            {isV2Pro && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Este modelo requiere S/N e IMEI 1.
                IMEI 2 es opcional.
              </div>
            )}
          </section>

          {/* SECCIÓN 3: IDENTIFICADORES */}
          <section className="space-y-5 border-t border-slate-200 pt-6">
            <div>
              <h2 className="text-lg font-bold">
                3. Identificadores del dispositivo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Corrige cualquier error del OCR usando
                la etiqueta física como referencia.
              </p>
            </div>

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
                maxLength={100}
                disabled={checking || saving}
                autoComplete="off"
                value={form.serialNumber}
                onChange={(event) =>
                  updateForm(
                    'serialNumber',
                    normalizeSerial(event.target.value),
                  )
                }
                placeholder="Número de serie del fabricante"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base outline-none focus:border-blue-600"
              />

              {form.serialNumber && !serialValid && (
                <p className="text-xs text-red-600">
                  Utiliza entre 6 y 100 caracteres
                  alfanuméricos, sin espacios.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="imei1"
                className="block text-sm font-semibold"
              >
                IMEI 1 *
              </label>

              <input
                id="imei1"
                required
                inputMode="numeric"
                maxLength={15}
                disabled={checking || saving}
                autoComplete="off"
                value={form.imei}
                onChange={(event) =>
                  updateForm(
                    'imei',
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 15),
                  )
                }
                placeholder="15 dígitos"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base outline-none focus:border-blue-600"
              />

              {form.imei && !imei1Valid && (
                <p className="text-xs text-amber-700">
                  El IMEI 1 no supera la verificación Luhn
                  o todavía no tiene 15 dígitos.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="imei2"
                className="block text-sm font-semibold"
              >
                IMEI 2{' '}
                {isV2s
                  ? '*'
                  : '(opcional para V2 PRO)'}
              </label>

              <input
                id="imei2"
                required={isV2s}
                inputMode="numeric"
                maxLength={15}
                disabled={checking || saving}
                autoComplete="off"
                value={form.imei2}
                onChange={(event) =>
                  updateForm(
                    'imei2',
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 15),
                  )
                }
                placeholder={
                  isV2s
                    ? 'Segundo IMEI, 15 dígitos'
                    : 'Dejar vacío si no existe'
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base outline-none focus:border-blue-600"
              />

              {form.imei2 && !imei2Valid && (
                <p className="text-xs text-amber-700">
                  Verifica los 15 dígitos y el dígito
                  de control del IMEI 2.
                </p>
              )}

              {!differentImeis && (
                <p className="text-sm font-medium text-red-600">
                  IMEI 1 e IMEI 2 deben ser diferentes.
                </p>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <ShieldCheck
                  size={19}
                  className="shrink-0 text-blue-600"
                />

                <p>
                  El sistema comprobará si alguno de estos
                  identificadores ya pertenece a otro
                  dispositivo registrado en Supabase.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: INFORMACIÓN ADICIONAL */}
          <section className="space-y-4 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold">
              4. Información adicional
            </h2>

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
                disabled={checking || saving}
                value={form.notes}
                onChange={(event) =>
                  updateForm('notes', event.target.value)
                }
                placeholder="Detalles opcionales del equipo"
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-600"
              />
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Almacén principal
              </p>

              <p className="mt-1 text-sm text-blue-700">
                ALM-001
              </p>

              <p className="mt-2 text-xs text-blue-600">
                El dispositivo ingresará con estado
                «En almacén».
              </p>
            </div>
          </section>

          {/* SECCIÓN 5: VALIDACIÓN */}
          <section className="space-y-4 border-t border-slate-200 pt-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ClipboardCheck size={22} />
              5. Confirmar y registrar
            </h2>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={reviewed}
                disabled={checking || saving}
                onChange={(event) => {
                  setReviewed(event.target.checked);
                  setError('');
                }}
                className="mt-1 h-4 w-4 accent-blue-600"
              />

              <span className="text-sm text-slate-700">
                He comprobado el modelo, S/N y los IMEI
                contra la etiqueta física del SUNMI.
              </span>
            </label>

            <button
              type="button"
              disabled={!valid || checking || saving}
              onClick={() => void checkDuplicates()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checking ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />
                  Comprobando...
                </>
              ) : (
                <>
                  <ShieldCheck size={19} />
                  Comprobar duplicados
                </>
              )}
            </button>

            {duplicatesVerified && (
              <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle2 size={18} />
                Identificadores disponibles.
              </p>
            )}

            {existing && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={20}
                    className="shrink-0"
                  />

                  <div>
                    <p className="font-bold">
                      Dispositivo duplicado
                    </p>

                    <p className="mt-1">
                      Código: {existing.internalCode}
                    </p>

                    <p>
                      Modelo: {existing.model.brand}{' '}
                      {existing.model.model}
                    </p>

                    <p>Estado: {existing.status}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <AlertTriangle
                  size={19}
                  className="shrink-0"
                />
                <p>{error}</p>
              </div>
            )}

            {message && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
              >
                <CheckCircle2
                  size={19}
                  className="shrink-0"
                />
                <p>{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSave}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <LoaderCircle
                    size={20}
                    className="animate-spin"
                  />
                  Guardando dispositivo...
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
              disabled={checking || saving}
              onClick={resetForm}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw size={17} />
              Limpiar formulario
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
