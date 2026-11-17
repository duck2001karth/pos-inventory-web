import { z } from 'zod';

/** Mientras exista un único operador autorizado, el acceso se limita al rol ADMIN. */
export function canAccessPosControl(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(1).max(256),
}).strict();

export function isAllowedOrigin(origin: string | null, requestUrl: string): boolean {
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(requestUrl).origin; }
  catch { return false; }
}
