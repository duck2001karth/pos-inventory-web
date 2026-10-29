
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import {
  canRegisterDevice,
  getCurrentUser,
  isSameOrigin,
} from '@/lib/auth';

const schema = z.object({
  serialNumber: z.string().trim().min(1).max(100),
  imei: z.string().regex(/^\d{15}$/),
  imei2: z.string().regex(/^\d{15}$/),
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(1000).optional(),
}).refine(
  (data) => data.imei !== data.imei2,
  { message: 'IMEI 1 e IMEI 2 deben ser diferentes' },
);

function duplicateFilter(
  serialNumber: string | null,
  imei: string | null,
  imei2: string | null,
) {
  const allImeis = [...new Set(
    [imei, imei2].filter((v): v is string => Boolean(v)),
  )];

  return {
    OR: [
      ...(serialNumber
        ? [{ serialNumber }]
        : []),
      ...allImeis.flatMap((value) => [
        { imei: value },
        { imei2: value },
      ]),
    ],
  };
}

const deviceSelect = {
  id: true,
  internalCode: true,
  serialNumber: true,
  imei: true,
  imei2: true,
  status: true,
  model: {
    select: { brand: true, model: true },
  },
} as const;

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);

  const serial = url.searchParams.get('serial')?.trim() || null;
  const imei = url.searchParams.get('imei')?.trim() || null;
  const imei2 = url.searchParams.get('imei2')?.trim() || null;

  if (
    (!serial && !imei && !imei2) ||
    (serial && serial.length > 100) ||
    (imei && !/^\d{15}$/.test(imei)) ||
    (imei2 && !/^\d{15}$/.test(imei2))
  ) {
    return NextResponse.json(
      { error: 'Identificadores inválidos' },
      { status: 400 },
    );
  }

  const device = await prisma.device.findFirst({
    where: duplicateFilter(serial, imei, imei2),
    select: deviceSelect,
  });

  return NextResponse.json(
    { exists: Boolean(device), device },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Origen no autorizado' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 },
    );
  }

  if (!canRegisterDevice(user.role)) {
    return NextResponse.json(
      { error: 'No tienes permisos para registrar POS' },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'JSON inválido' },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Verifica SN, IMEI 1 e IMEI 2' },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.device.findFirst({
        where: duplicateFilter(
          data.serialNumber,
          data.imei,
          data.imei2,
        ),
        select: {
          internalCode: true,
        },
      });

      if (duplicate) {
        return {
          kind: 'duplicate' as const,
          code: duplicate.internalCode,
        };
      }

      const warehouse = await tx.location.findUnique({
        where: { code: 'ALM-001' },
      });

      if (!warehouse?.isActive) {
        throw new Error('WAREHOUSE_NOT_AVAILABLE');
      }

      const deviceModel = await tx.deviceModel.upsert({
        where: {
          brand_model: {
            brand: data.brand,
            model: data.model,
          },
        },
        update: {},
        create: {
          brand: data.brand,
          model: data.model,
        },
      });

      const device = await tx.device.create({
        data: {
          internalCode: `POS-${randomUUID().toUpperCase()}`,
          serialNumber: data.serialNumber,
          imei: data.imei,
          imei2: data.imei2,
          modelId: deviceModel.id,
          currentLocationId: warehouse.id,
          status: 'IN_STOCK',
          notes: data.notes || null,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          deviceId: device.id,
          type: 'RECEIPT',
          actorId: user.id,
          toLocationId: warehouse.id,
          newStatus: 'IN_STOCK',
          notes: 'Registro inicial del POS',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'Device',
          entityId: device.id,
          actorId: user.id,
          details: {
            internalCode: device.internalCode,
            serialNumber: data.serialNumber,
            imei1: data.imei,
            imei2: data.imei2,
            location: warehouse.code,
          },
        },
      });

      return {
        kind: 'created' as const,
        id: device.id,
        internalCode: device.internalCode,
      };
    });

    if (result.kind === 'duplicate') {
      return NextResponse.json(
        {
          error: 'El dispositivo ya está registrado',
          internalCode: result.code,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        device: {
          id: result.id,
          internalCode: result.internalCode,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Uno de los identificadores ya existe' },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      error.message === 'WAREHOUSE_NOT_AVAILABLE'
    ) {
      return NextResponse.json(
        { error: 'Almacén principal no disponible' },
        { status: 409 },
      );
    }

    console.error('Error registrando POS:', error);

    return NextResponse.json(
      { error: 'No se pudo registrar el POS' },
      { status: 500 },
    );
  }
}
