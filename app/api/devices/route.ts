
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

import {
  canRegisterDevice,
  getCurrentUser,
  isSameOrigin,
} from '@/lib/auth';

// ------------------------------------------------------
// Modelos de SUNMI admitidos en esta primera fase
// ------------------------------------------------------

const SUNMI_MODELS = [
  'V2s / T5940',
  'V2 PRO / T5921',
] as const;

const imeiSchema = z.string().regex(/^\d{15}$/, {
  message: 'El IMEI debe contener exactamente 15 dígitos',
});

function isValidImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;

  let sum = 0;

  for (let i = 0; i < imei.length; i++) {
    let digit = Number(imei[imei.length - 1 - i]);

    if (i % 2 === 1) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  return sum % 10 === 0;
}

// ------------------------------------------------------
// Validación del registro
// ------------------------------------------------------

const deviceSchema = z
  .object({
    serialNumber: z
      .string()
      .trim()
      .toUpperCase()
      .min(6)
      .max(100)
      .regex(/^[A-Z0-9-]+$/, {
        message: 'El S/N contiene caracteres inválidos',
      }),

    imei: imeiSchema,

    // V2 PRO puede no tener segundo IMEI.
    // Se transforma una cadena vacía en null.
    imei2: z
      .union([z.literal(''), imeiSchema])
      .optional()
      .default('')
      .transform((value) => value || null),

    brand: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => value === 'SUNMI', {
        message: 'La marca debe ser SUNMI',
      }),

    model: z.enum(SUNMI_MODELS),

    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .default(''),
  })
  .superRefine((data, ctx) => {
    if (!isValidImei(data.imei)) {
      ctx.addIssue({
        code: 'custom',
        path: ['imei'],
        message: 'IMEI 1 no supera la verificación Luhn',
      });
    }

    if (
      data.model === 'V2s / T5940' &&
      !data.imei2
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['imei2'],
        message: 'IMEI 2 es obligatorio para SUNMI V2s',
      });
    }

    if (data.imei2 && !isValidImei(data.imei2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['imei2'],
        message: 'IMEI 2 no supera la verificación Luhn',
      });
    }

    if (data.imei2 && data.imei === data.imei2) {
      ctx.addIssue({
        code: 'custom',
        path: ['imei2'],
        message: 'IMEI 1 e IMEI 2 deben ser diferentes',
      });
    }
  });

// ------------------------------------------------------
// Condición de búsqueda de duplicados
//
// Un IMEI no debe pertenecer a otro equipo,
// independientemente de si está guardado en
// la columna imei o imei2.
// ------------------------------------------------------

function duplicateFilter(
  serialNumber: string | null,
  imei1: string | null,
  imei2: string | null,
) {
  const identifiers = [
    ...new Set(
      [imei1, imei2].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];

  return {
    OR: [
      ...(serialNumber
        ? [{ serialNumber }]
        : []),

      ...identifiers.flatMap((value) => [
        { imei: value },
        { imei2: value },
      ]),
    ],
  };
}

// ------------------------------------------------------
// Manejo de errores comunes de Prisma
// ------------------------------------------------------

function hasPrismaCode(
  error: unknown,
  code: string,
): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function jsonError(
  message: string,
  status: number,
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

// ------------------------------------------------------
// GET /api/devices
//
// Consulta previa de duplicados.
// Solo usuarios autenticados.
// ------------------------------------------------------

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError('No autenticado', 401);
  }

  if (!canRegisterDevice(user.role)) {
    return jsonError(
      'No tienes permisos para comprobar dispositivos',
      403,
    );
  }

  const url = new URL(request.url);

  const serialNumber =
    url.searchParams
      .get('serial')
      ?.trim()
      .toUpperCase() || null;

  const imei =
    url.searchParams.get('imei')?.trim() || null;

  const imei2 =
    url.searchParams.get('imei2')?.trim() || null;

  if (!serialNumber && !imei && !imei2) {
    return jsonError(
      'Introduce al menos un identificador',
      400,
    );
  }

  if (
    (serialNumber &&
      !/^[A-Z0-9-]{6,100}$/.test(serialNumber)) ||
    (imei && !/^\d{15}$/.test(imei)) ||
    (imei2 && !/^\d{15}$/.test(imei2))
  ) {
    return jsonError('Identificadores inválidos', 400);
  }

  try {
    const device = await prisma.device.findFirst({
      where: duplicateFilter(
        serialNumber,
        imei,
        imei2,
      ),

      select: {
        id: true,
        internalCode: true,
        serialNumber: true,
        imei: true,
        imei2: true,
        status: true,

        model: {
          select: {
            brand: true,
            model: true,
          },
        },

        currentLocation: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        exists: Boolean(device),
        device,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error(
      'Error al comprobar duplicados:',
      error,
    );

    return jsonError(
      'No se pudo consultar el inventario',
      500,
    );
  }
}

// ------------------------------------------------------
// POST /api/devices
//
// Registra un dispositivo y su entrada al almacén.
//
// La transacción incluye:
// 1. Comprobación de duplicados
// 2. Validación del almacén
// 3. Marca y modelo
// 4. Dispositivo
// 5. Movimiento inicial
// 6. Auditoría
// ------------------------------------------------------

export async function POST(request: Request) {
  // Protección contra solicitudes de otro origen.
  if (!isSameOrigin(request)) {
    return jsonError('Origen no autorizado', 403);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError('No autenticado', 401);
  }

  if (!canRegisterDevice(user.role)) {
    return jsonError(
      'No tienes permisos para registrar dispositivos',
      403,
    );
  }

  // Evitar procesar cuerpos demasiado grandes.
  const contentLength = Number(
    request.headers.get('content-length') ?? '0',
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > 16_384
  ) {
    return jsonError(
      'La solicitud supera el tamaño permitido',
      413,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError('El JSON enviado no es válido', 400);
  }

  const parsed = deviceSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return NextResponse.json(
      {
        error: 'Revisa los datos del dispositivo',
        details: issues,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Buscar coincidencias por serie y
        //    por ambos IMEI, cruzando las columnas.
        const existing = await tx.device.findFirst({
          where: duplicateFilter(
            data.serialNumber,
            data.imei,
            data.imei2,
          ),

          select: {
            id: true,
            internalCode: true,
          },
        });

        if (existing) {
          return {
            kind: 'duplicate' as const,
            internalCode: existing.internalCode,
          };
        }

        // 2. Verificar el almacén principal.
        const warehouse = await tx.location.findUnique({
          where: {
            code: 'ALM-001',
          },
        });

        if (!warehouse || !warehouse.isActive) {
          throw new Error('WAREHOUSE_NOT_AVAILABLE');
        }

        // 3. Buscar o crear marca/modelo.
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

        // 4. Crear el dispositivo.
        // Usamos UUID para evitar colisiones
        // al generar el código interno.
        const device = await tx.device.create({
          data: {
            internalCode:
              `POS-${randomUUID().toUpperCase()}`,

            serialNumber: data.serialNumber,
            imei: data.imei,
            imei2: data.imei2,

            modelId: deviceModel.id,
            currentLocationId: warehouse.id,

            status: 'IN_STOCK',
            notes: data.notes || null,
          },

          select: {
            id: true,
            internalCode: true,
            serialNumber: true,
            status: true,
          },
        });

        // 5. Registrar el ingreso al almacén.
        await tx.inventoryMovement.create({
          data: {
            deviceId: device.id,
            type: 'RECEIPT',

            actorId: user.id,
            toLocationId: warehouse.id,

            previousStatus: null,
            newStatus: 'IN_STOCK',

            notes:
              'Entrada inicial por registro de dispositivo POS',
          },
        });

        // 6. Guardar la trazabilidad de creación.
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

              brand: data.brand,
              model: data.model,

              warehouseCode: warehouse.code,
              initialStatus: 'IN_STOCK',
            },
          },
        });

        return {
          kind: 'created' as const,
          device: {
            id: device.id,
            internalCode: device.internalCode,
            serialNumber: device.serialNumber,
            status: device.status,
          },
        };
      },
    );

    // Ya estaba registrado.
    if (result.kind === 'duplicate') {
      return NextResponse.json(
        {
          error:
            'Este dispositivo ya está registrado en el inventario',
          internalCode: result.internalCode,
        },
        { status: 409 },
      );
    }

    // Registro completado.
    return NextResponse.json(
      {
        success: true,
        message: 'Dispositivo registrado correctamente',
        device: result.device,
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error: unknown) {
    // Restricciones únicas de PostgreSQL.
    if (hasPrismaCode(error, 'P2002')) {
      return jsonError(
        'El número de serie, IMEI o código interno ya existe',
        409,
      );
    }

    // Conflictos de transacción.
    if (hasPrismaCode(error, 'P2034')) {
      return jsonError(
        'Conflicto al registrar el POS. Inténtalo nuevamente.',
        409,
      );
    }

    if (
      error instanceof Error &&
      error.message === 'WAREHOUSE_NOT_AVAILABLE'
    ) {
      return jsonError(
        'El almacén principal ALM-001 no está disponible',
        409,
      );
    }

    console.error(
      'Error al registrar el dispositivo POS:',
      error,
    );

    return jsonError(
      'No se pudo registrar el dispositivo',
      500,
    );
  }
}
