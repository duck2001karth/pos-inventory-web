import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccessPosControl, isAllowedOrigin, loginSchema } from '../lib/security/auth-policy';

test('only ADMIN is allowed', () => {
  assert.equal(canAccessPosControl('ADMIN'), true);
  assert.equal(canAccessPosControl('VIEWER'), false);
  assert.equal(canAccessPosControl('OPERATOR'), false);
  assert.equal(canAccessPosControl(null), false);
});

test('same origin required for mutations', () => {
  assert.equal(isAllowedOrigin('https://pos.example.com', 'https://pos.example.com/api/auth/login'), true);
  assert.equal(isAllowedOrigin('https://external.example.com', 'https://pos.example.com/api/auth/login'), false);
  assert.equal(isAllowedOrigin(null, 'https://pos.example.com/api/auth/login'), false);
});

test('strict login payload validation', () => {
  assert.equal(loginSchema.safeParse({ email: 'admin@example.com', password: 'password' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'password' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'admin@example.com', password: 'password', role: 'ADMIN' }).success, false);
});
