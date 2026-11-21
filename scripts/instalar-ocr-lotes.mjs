/** Ejecutar desde la raíz del repositorio: node scripts/instalar-ocr-lotes.mjs */
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'components/inventory/register-pos-form.tsx');
if (!fs.existsSync(file)) {
  console.error('No se encontró components/inventory/register-pos-form.tsx. Ejecuta desde la raíz del proyecto.');
  process.exit(1);
}
let content = fs.readFileSync(file, 'utf8');
if (content.includes('href="/inventario/registrar/lotes"') && content.includes("field !== 'notes'")) {
  console.log('OCR por lotes y corrección de observaciones ya están aplicados.');
  process.exit(0);
}
// Fail closed: no modificar archivos si la estructura esperada es diferente.
const oldFunction = `  function updateField(field: keyof DeviceForm, value: string) {
    if (savingRef.current) return;
    setError('');
    setDuplicateCheck(emptyCheck());
    setForm((previous) => ({ ...previous, [field]: value }));
  }`;
const newFunction = `  function updateField(field: keyof DeviceForm, value: string) {
    if (savingRef.current) return;
    setError('');
    // Observaciones no cambian S/N ni IMEI: conservar verificación de duplicados.
    if (field !== 'notes' && field !== 'brand') {
      setDuplicateCheck(emptyCheck());
    }
    setForm((previous) => ({ ...previous, [field]: value }));
  }`;
const header = `        <div role="group" aria-label="Método de registro" className="grid grid-cols-2 gap-2 sm:gap-3">`;
const afterButton = `            <Keyboard size={19} /> Registro manual
          </button>
        </div>`;
const withBatch = `            <Keyboard size={19} /> Registro manual
          </button>
          <Link href="/inventario/registrar/lotes" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-3 text-center text-sm font-semibold text-[var(--app-fg)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] sm:px-4">
            OCR por lotes
          </Link>
        </div>`;
if (!content.includes(oldFunction) && !content.includes(newFunction)) {
  console.error('No se encontró updateField en el formato esperado. No se ha modificado nada.'); process.exit(1);
}
if (!content.includes('href="/inventario/registrar/lotes"') && (!content.includes(header) || !content.includes(afterButton))) {
  console.error('El formulario tiene una estructura de pestañas diferente. No se ha modificado nada.'); process.exit(1);
}
const updated = content
  .replace(oldFunction,newFunction)
  .replace(header,`        <div role="group" aria-label="Método de registro" className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">`)
  .replace(afterButton,withBatch);
// Keep one local backup. Do not overwrite prior backup on re-run.
const backup = `${file}.before-ocr-batch.bak`;
if (!fs.existsSync(backup)) fs.copyFileSync(file,backup);
fs.writeFileSync(file, updated, 'utf8');
console.log('Aplicado: corrección de notas y enlace a /inventario/registrar/lotes.');
console.log('Copia de seguridad:',backup);
