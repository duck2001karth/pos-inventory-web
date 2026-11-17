import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { canAccessPosControl, isAllowedOrigin } from '@/lib/security/auth-policy';

export const SESSION_COOKIE = 'pos_session';
const key = process.env.SESSION_SECRET;
if (!key || key.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres');
const secret = new TextEncoder().encode(key);

export async function createSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('pos-inventory')
    .setAudience('pos-inventory-web')
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'], issuer: 'pos-inventory', audience: 'pos-inventory-web',
    });
    if (!payload.sub) return null;
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    });
    return user && canAccessPosControl(user.role) ? user : null;
  } catch { return null; }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
export function canRegisterDevice(role: string) { return canAccessPosControl(role); }
export function isSameOrigin(request: Request) { return isAllowedOrigin(request.headers.get('origin'), request.url); }
