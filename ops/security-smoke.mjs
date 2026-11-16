// Prueba segura: únicamente solicitudes GET sin cookies a rutas protegidas.
// Uso: node ops/security-smoke.mjs https://tu-dominio.vercel.app
const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) {
  console.error('Uso: node ops/security-smoke.mjs https://tu-dominio');
  process.exit(2);
}
const paths = [
  '/api/devices?imei=123456789012345',
  '/api/devices/id-inexistente',
  '/api/almacenes',
  '/api/reports/inventory',
  '/api/reports/warehouses',
  '/api/reports/export?type=summary',
];
let errors = 0;
for (const path of paths) {
  try {
    const response = await fetch(new URL(path, base), {
      method: 'GET', headers: { Accept: 'application/json' },
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    const ok = response.status === 401 || response.status === 403;
    console.log(`${ok ? 'OK' : 'FALLO'} ${response.status} ${path}`);
    if (!ok) errors++;
  } catch (error) {
    errors++;
    console.error(`ERROR ${path}: ${error.message}`);
  }
}
if (errors) process.exitCode = 1;
