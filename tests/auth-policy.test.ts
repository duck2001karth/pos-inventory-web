import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessPosControl, isAllowedOrigin, loginSchema } from '../lib/security/auth-policy';

test('solo ADMIN puede utilizar POS Control por ahora', () => {
  assert.equal(canAccessPosControl('ADMIN'), true);
  for (const role of ['INVENTORY_MANAGER', 'OPERATOR', 'VIEWER', '', null]) {
    assert.equal(canAccessPosControl(role), false);
  }
});

test('normaliza email y no acepta campos adicionales', () => {
  const parsed = loginSchema.parse({ email: ' ADMIN@EXAMPLE.COM ', password: '123456789012' });
  assert.equal(parsed.email, 'admin@example.com');
  assert.equal(loginSchema.safeParse({ email: 'a@b.co', password: 'pass', role: 'ADMIN' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'malformado', password: 'pass' }).success, false);
});

test('rechaza contraseñas vacías o excesivamente largas', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(257) }).success, false);
});

test('CSRF: origen exacto, sin permitir subdominios ni esquemas diferentes', () => {
  const url = 'https://pos-inventory-web.vercel.app/api/auth/login';
  assert.equal(isAllowedOrigin('https://pos-inventory-web.vercel.app', url), true);
  assert.equal(isAllowedOrigin('https://evil.pos-inventory-web.vercel.app', url), false);
  assert.equal(isAllowedOrigin('http://pos-inventory-web.vercel.app', url), false);
  assert.equal(isAllowedOrigin(null, url), false);
  assert.equal(isAllowedOrigin('not-a-url', url), false);
});
