
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL no está configurada');
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const warehouse = await prisma.location.upsert({
      where: {
        code: 'ALM-001',
      },
      update: {},
      create: {
        code: 'ALM-001',
        name: 'Almacén principal',
        description: 'Almacén inicial del inventario POS',
        isActive: true,
      },
    });

    console.log('Almacén creado o existente:', {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Error al crear el almacén:', error);
  process.exitCode = 1;
});
