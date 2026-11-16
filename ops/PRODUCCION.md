# POS Control: seguridad, pruebas y producción

## Objetivo actual
- Un solo usuario administrador (`ADMIN`). No crear interfaz de registro público.
- Nunca eliminar ni convertir registros existentes en Prisma durante esta fase.
- Mantener el usuario `ADMIN` existente; no ejecutar `create-admin.ts` si ya existe.

## Antes de aplicar el código
1. Crear un respaldo verificable de PostgreSQL/Supabase y probar que se puede restaurar en entorno aislado.
2. Mantener `main` estable hasta que finalicen las pruebas.
3. Revisar `git diff` para asegurar que no se agreguen contraseñas ni `.env`.

## Validaciones locales
```powershell
node ops/check-env.mjs
npx prisma generate
npx tsc --noEmit
npx tsx --test tests/auth-policy.test.ts
npm run lint
npm run build
```

## Vercel
- Producción asociada a la rama `main`.
- Variables de entorno configuradas en Production: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `SUPABASE_CA_CERT_BASE64`.
- Nunca exponer esos valores en `NEXT_PUBLIC_*` ni en logs.
- `SESSION_SECRET` >= 32 caracteres aleatorios.
- No usar rutas de Windows en `NODE_EXTRA_CA_CERTS` dentro de Vercel.
- Activar reglas de limitación de intentos de login para `/api/auth/login` en el WAF/Firewall del proveedor. **Este paquete no implementa rate limiting distribuido**.
- Revisar actividad de inicio de sesión, errores 401/403/429 y anomalías de tráfico.

## Pruebas manuales
1. Inicio con ADMIN válido → dashboard accesible.
2. Contraseña incorrecta → 401, sin sesión.
3. Usuario no ADMIN existente → 401.
4. Anónimo a endpoints de datos y reportes → 401.
5. Petición POST con `Origin` externo → 403.
6. Confirmar que no se puede mutar inventario sin cookie.
7. Exportación y lectura del inventario desde ADMIN → correctas.
8. Revisar cambios de almacén y movimiento en `AuditLog`.
9. El logout debe invalidar la cookie del navegador.
10. Copia de respaldo disponible antes de cualquier migración.

## Notas y límites
- Un solo administrador significa **acceso exclusivo del rol ADMIN**; el código no elimina otras cuentas existentes.
- Protección contra fuerza bruta requiere control distribuido en proveedor o almacén persistente; no confiar en contador en memoria de Next.js/Vercel.
- Se recomienda MFA delante de la aplicación, por ejemplo SSO/proxy de acceso, si el proyecto tendrá exposición pública.
- Limitar los exportes: incluyen IMEI/SN y se consideran datos sensibles del inventario.
- Los tests de esta fase prueban validación de seguridad pura. No sustituyen pruebas end-to-end con una base de datos de staging.
