
import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import {
  createSession,
  isSameOrigin,
  SESSION_COOKIE,
} from '@/lib/auth';


const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Origen no autorizado' },
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

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos de acceso inválidos' },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  const validPassword =
    user && user.isActive
      ? await compare(parsed.data.password, user.passwordHash)
      : false;

  if (!user || !validPassword || !user.isActive) {
    return NextResponse.json(
      { error: 'Credenciales incorrectas' },
      { status: 401 },
    );
  }

  const token = await createSession(user.id);

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}
