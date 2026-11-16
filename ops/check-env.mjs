// Comprobación local de configuración; nunca muestra valores secretos.
import 'dotenv/config';
const required = ['DATABASE_URL', 'DIRECT_URL', 'SESSION_SECRET', 'SUPABASE_CA_CERT_BASE64'];
let errors = 0;
for (const key of required) {
  const present = Boolean(process.env[key]);
  console.log(`${present ? 'OK' : 'FALTA'} ${key}`);
  if (!present) errors++;
}
if ((process.env.SESSION_SECRET ?? '').length < 32) {
  console.error('SESSION_SECRET debe tener al menos 32 caracteres');
  errors++;
}
if (process.env.NODE_EXTRA_CA_CERTS?.match(/^[A-Za-z]:\\/)) {
  console.warn('NODE_EXTRA_CA_CERTS es una ruta de Windows: no debe usarse en Vercel.');
}
if (errors) process.exitCode = 1;
