
import 'dotenv/config';

import { input, password } from '@inquirer/prompts';
import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no configurada');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('Ya existe un administrador. No se creó otro.');
      return;
    }

    const name = await input({
      message: 'Nombre del administrador:',
      validate: (value) =>
        value.trim().length >= 2 || 'Introduce un nombre válido',
    });

    const email = (
      await input({
        message: 'Correo electrónico:',
        validate: (value) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
          'Introduce un correo válido',
      })
    ).trim().toLowerCase();

    const secret = await password({
      message: 'Contraseña (mínimo 12 caracteres):',
      mask: '*',
      validate: (value) =>
        value.length >= 12 || 'Debe tener al menos 12 caracteres',
    });

    const passwordHash = await hash(secret, 12);

    await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('Administrador creado correctamente.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('No se pudo crear el administrador:', error);
  process.exitCode = 1;
});
