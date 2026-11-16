import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSession, SESSION_COOKIE } from '@/lib/auth';
import { canAccessPosControl, isAllowedOrigin, loginSchema } from '@/lib/security/auth-policy';

function failure(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get('origin'), request.url)) {
    return failure('Origen no autorizado', 403);
  }

  // Limitar la lectura real, no solo confiar en Content-Length.
  const size = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(size) && size > 2048) {
    return failure('Solicitud demasiado grande', 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return failure('Solicitud inválida', 400);
  }
  if (raw.length > 2048) {
    return failure('Solicitud demasiado grande', 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return failure('Solicitud inválida', 400);
  }
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return failure('Datos de acceso inválidos', 400);

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    // No revelamos si la cuenta existe, está inactiva o tiene otro rol.
    const authenticated = Boolean(
      user && user.isActive && canAccessPosControl(user.role) &&
      await compare(parsed.data.password, user.passwordHash),
    );
    if (!authenticated || !user) return failure('Credenciales incorrectas', 401);

    const token = await createSession(user.id);
    const response = NextResponse.json(
      { success: true, user: { id: user.id, name: user.name, role: user.role } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    console.error('Fallo en autenticación:', error);
    return failure('No se pudo iniciar sesión', 500);
  }
}
