
import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/app/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
const caBase64 = process.env.SUPABASE_CA_CERT_BASE64;

if (!connectionString) {
  throw new Error('DATABASE_URL no está configurada');
}

if (!caBase64) {
  throw new Error(
    'SUPABASE_CA_CERT_BASE64 no está configurada',
  );
}

const ca = Buffer.from(caBase64, 'base64').toString('utf8');

if (
  !ca.includes('-----BEGIN CERTIFICATE-----') ||
  !ca.includes('-----END CERTIFICATE-----')
) {
  throw new Error(
    'El certificado CA de Supabase no tiene formato válido',
  );
}

// Los parámetros SSL en la URL pueden sobrescribir
// las opciones de SSL de node-postgres.
const url = new URL(connectionString);

url.searchParams.delete('sslmode');
url.searchParams.delete('sslrootcert');
url.searchParams.delete('sslcert');
url.searchParams.delete('sslkey');

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: {
      ca,
      rejectUnauthorized: true,
    },
  });

  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
