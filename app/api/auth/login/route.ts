import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, SESSION_COOKIE } from '@/lib/auth';
import { canAccessPosControl, isAllowedOrigin, loginSchema } from '@/lib/security/auth-policy';

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get('origin'), request.url)) return fail('Origen no autorizado', 403);
  const size = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(size) && size > 2048) return fail('Solicitud demasiado grande', 413);
  let raw: string;
  try { raw = await request.text(); }
  catch { return fail('Solicitud inválida', 400); }
  if (raw.length > 2048) return fail('Solicitud demasiado grande', 413);
  let payload: unknown;
  try { payload = JSON.parse(raw); }
  catch { return fail('JSON inválido', 400); }
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return fail('Datos de acceso inválidos', 400);
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const valid = Boolean(user && user.isActive && canAccessPosControl(user.role) &&
      await compare(parsed.data.password, user.passwordHash));
    if (!valid || !user) return fail('Credenciales incorrectas', 401);
    const token = await createSession(user.id);
    const result = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } }, { headers: { 'Cache-Control': 'no-store' } });
    result.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 60 * 60 * 8 });
    return result;
  } catch (error) {
    console.error('Fallo de autenticación:', error);
    return fail('No se pudo iniciar sesión', 500);
  }
}
