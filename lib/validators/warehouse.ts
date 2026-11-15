import { z } from 'zod';

export const warehouseCreateSchema = z.object({
  code: z.string().trim().toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{2,19}$/, 'Código de 3 a 20 caracteres: letras, números, _ o -'),
  name: z.string().trim().min(3, 'Escribe un nombre de al menos 3 caracteres').max(100),
  description: z.string().trim().max(500).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
});

export const warehouseUpdateSchema = warehouseCreateSchema.omit({ code: true }).extend({
  isActive: z.boolean(),
});
