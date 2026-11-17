# Seguridad y pruebas — POS Control

Este paquete incluye una copia de los controles de acceso por rol ADMIN actuales. **Si tu rama main ya tiene estos archivos, no los vuelvas a sobrescribir sin revisar `git diff`.**

## Estado verificado en GitHub
- `lib/auth.ts` y `lib/security/auth-policy.ts` ya restringen acceso a ADMIN.
- `app/api/auth/login/route.ts` valida credenciales y evita dar pistas sobre el usuario.
- `next.config.ts` ya tiene encabezados HTTP de seguridad. No es necesario modificarlo para las cámaras.
- La captura recibida por el usuario corresponde a la interfaz de cámara, no a un error específico de seguridad.

## Pruebas
1. `npx tsx --test tests/auth-policy.test.ts`
2. `npx tsc --noEmit`
3. `npm run build`
4. Prueba login correcto e incorrecto, cerrar sesión, acceso sin sesión a `/inventario` y `/reportes`, y rechazo de POST API sin cookie.
5. Revisa los logs de Vercel después del despliegue. No publiques `.env`, tokens ni claves.
6. Configura protección anti fuerza bruta a nivel de Vercel/WAF. Un test de políticas no equivale a rate limiting real.
7. Revisa respaldos de Supabase y prueba restauración en una base de ensayo.

## Atención
`getCurrentUser` verifica rol ADMIN, pero la política no obliga físicamente a que exista **exactamente** una fila ADMIN. No es un mecanismo para eliminar usuarios previos.
