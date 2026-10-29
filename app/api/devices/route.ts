
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import {
  canRegisterDevice,
  getCurrentUser,
  isSameOrigin,
} from '@/lib/auth';



const deviceSchema = z.object({
  serialNumber: z.string().trim().min(1).max(100),
  imei: z.string().trim().max(30).optional(),
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const serial = url.searchParams.get('serial')?.trim();

  if (!serial || serial.length > 100) {
    return NextResponse.json(
      { error: 'Número de serie inválido' },
      { status: 400 },
    );
  }

  const device = await prisma.device.findUnique({
    where: { serialNumber: serial },
    select: {
      id: true,
      internalCode: true,
      serialNumber: true,
      status: true,
      model: {
        select: { brand: true, model: true },
      },
      currentLocation: {
        select: { name: true },
      },
    },
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

  const parsed = deviceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Verifica los datos del dispositivo' },
      { status: 400 },
    );
  }

  const { serialNumber, imei, brand, model, notes } =
    parsed.data;

  const normalizedImei = imei?.trim() || null;

  if (
    normalizedImei &&
    !/^\d{15}$/.test(normalizedImei)
  ) {
    return NextResponse.json(
      { error: 'El IMEI debe contener 15 dígitos' },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.device.findFirst({
        where: {
          OR: [
            { serialNumber },
            ...(normalizedImei
              ? [{ imei: normalizedImei }]
              : []),
          ],
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

      if (!warehouse || !warehouse.isActive) {
        throw new Error('WAREHOUSE_NOT_AVAILABLE');
      }

      const deviceModel = await tx.deviceModel.upsert({
        where: {
          brand_model: { brand, model },
        },
        update: {},
        create: { brand, model },
      });

      const device = await tx.device.create({
        data: {
          internalCode: `POS-${randomUUID().toUpperCase()}`,
          serialNumber,
          imei: normalizedImei,
          modelId: deviceModel.id,
          currentLocationId: warehouse.id,
          status: 'IN_STOCK',
          notes: notes || null,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          deviceId: device.id,
          type: 'RECEIPT',
          actorId: user.id,
          toLocationId: warehouse.id,
          previousStatus: null,
          newStatus: 'IN_STOCK',
          notes: 'Entrada inicial por registro de dispositivo',
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
            serialNumber,
            warehouseCode: warehouse.code,
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
          error: 'Este dispositivo ya está registrado',
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
        { error: 'La serie, IMEI o código ya está registrado' },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      error.message === 'WAREHOUSE_NOT_AVAILABLE'
    ) {
      return NextResponse.json(
        { error: 'El almacén principal no está disponible' },
        { status: 409 },
      );
    }

    console.error('Error al registrar POS:', error);

    return NextResponse.json(
      { error: 'No se pudo registrar el dispositivo' },
      { status: 500 },
    );
  }
}
