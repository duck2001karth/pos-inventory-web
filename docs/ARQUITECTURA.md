# POS Control — Arquitectura propuesta (validada contra GitHub main, 2026-11-15)

## Criterio de organización

- `app/`: rutas, layouts, `page.tsx`, `route.ts` de HTTP. Los `page.tsx` importan vistas y gestionan `Suspense` / `searchParams` / `params`. Evitar UI grande y SQL aquí.
- `components/ui/`: piezas de interfaz genéricas (Button, Dialog, Input, StatusBadge, Table). Sin Prisma ni conocimiento del dominio.
- `components/inventory/list/`: filtros, tablas/tarjetas, resumen y paginación del inventario.
- `components/inventory/detail/`: ficha y movimientos de cada POS.
- `components/inventory/register/`: separar formulario y validación por etapas. **No mover el formulario actual hasta confirmar pruebas y revisar su contrato exacto.**
- `components/scanner/ocr/`: foto, cámara guiada, Tesseract, validación, confirmación.
- `components/scanner/barcode/`: lectura de imágenes y futuras herramientas ZXing.
- `lib/services/`: consultas Prisma ejecutadas exclusivamente en el servidor.
- `lib/utils/`: funciones puras compartidas; `parse-sunmi-label.ts` continúa aquí.
- `types/`: tipos serializables cruzando Server/Client Components.
- `prisma/`: esquema, seed y migraciones. No se modifica en esta entrega.

## Hallazgos concretos

1. La ruta de ficha es `app/inventario/[id]/page.tx`, con extensión incorrecta: no se reconoce como una ruta de Next.js. Esta entrega crea `page.tsx`; borra `page.tx` una vez confirmado.
2. `app/escaner/page.tsx` es la ruta actual del lector; **no** `/inventario/escaner`. No alterar el menú sin revisarlo.
3. Existen `components/inventory/inventory-table.tsx` (con modal) y `components/inventory/list/inventory-table.tsx`; para esta entrega la vista se conecta al segundo y el modal antiguo queda conservado como respaldo.
4. `inventory-query.ts` ahora sirve una búsqueda de texto y filtros. Su firma admite también el antiguo `inventoryWhere('texto')` para compatibilidad.
5. Exportación Excel debe reutilizar exactamente los mismos filtros que la tabla.
6. Las observaciones viven en `Device.notes`. Conteos `null` y `''`; notas con espacios aislados deberán normalizarse en una mejora posterior.
7. `DeviceStatus` contiene `IN_STOCK`, `ASSIGNED`, `IN_TRANSIT`, `IN_REPAIR`, `RETIRED`, `LOST`.
8. `InventoryMovement` incluye `actor`, `fromLocation`, `toLocation`, `createdAt`, `notes`, y la relación `Device.movements`.
9. `Device.imei2` existe y es opcional. MEID aún no está persistido.
10. API `/api/devices` mantiene validaciones y transacción; no se modifica.

## Carpetas tras instalar la entrega

```
app/
  inventario/
    page.tsx                <- pequeño, Suspense
    [id]/page.tsx           <- pequeño, Suspense
    registrar/page.tsx      <- conservar
  escaner/page.tsx          <- conservar
  api/reports/inventory/route.ts <- mismos filtros que inventario
components/
  inventory/
    inventario-content.tsx  <- orquesta datos y UI del inventario
    list/
      inventory-filters.tsx
      inventory-table.tsx
    detail/device-detail.tsx
  scanner/
    barcode-scanner-page.tsx
    barcode/barcode-image-reader.tsx
    scanner-pos.tsx         <- conservar por ahora
    scanner-ocr.tsx         <- conservar export compatibilidad
    ocr/
      image-preprocess.ts   <- conservar
      ocr-capture.tsx
      ocr-camera.tsx
      ocr-confirm-modal.tsx
      ocr-read-status.tsx
      recognize-label.ts
      scanner-ocr.tsx
components/ui/
  button.tsx                <- conservar
  status-badge.tsx          <- conservar
  alert-dialog.tsx         <- conservar
lib/
  auth.ts                   <- conservar
  prisma.ts                 <- conservar
  services/inventory-query.ts
  utils/parse-sunmi-label.ts <- conservar
```

## Instalación segura en PowerShell

```powershell
# Crear rama y respaldo (sin tocar datos Supabase)
git status
git switch -c refactor/fase2-inventario-ocr
# Descomprime este ZIP y copia sus archivos manteniendo rutas.
# Conserva los demás archivos que no estén incluidos.
npx prisma generate
npx tsc --noEmit
npm run build
```

### Pruebas manuales (antes de hacer merge)

- `/inventario`: total y conteos, con y sin observaciones, filtros combinados y paginación.
- Exportar Excel **con filtros activos**, comparar cantidad y observar columna `Observaciones`.
- `/inventario/[id]`: ficha e historial real de movimientos; ID inexistente -> 404.
- `/inventario/registrar`: OCR y manual, comprobar que no cambió el flujo POST.
- iPhone Safari: cámara guiada, cámara nativa y OCR por galería. Si la cámara guiada no abre, cámara nativa disponible.
- `/escaner`: decodificación por cámara o imagen, ambos modelos.
- Usuarios sin sesión no deben entrar a `inventario`; atención: **la ruta /escaner ya estaba fuera del layout protegido**, revisar autenticación antes de publicar (ver hallazgos).
- Contrastar 10 fotos reales por modelo contra la etiqueta. No declarar la precisión OCR validada con una o dos imágenes.

## Siguiente refactor (no incluido)

1. Auditar el registro actual y separar `register-pos-form.tsx` en hooks y UI sin alterar validaciones.
2. Extraer consultas Prisma del render en `inventory-content.tsx` hacia `lib/services/inventory-service.ts`.
3. Mover el escáner al segmento protegido o crear un layout de autorización.
4. Unificar modal antiguo de ficha con la página de detalle; borrar archivos duplicados tras pruebas.
5. Implementar MEID mediante migración, reforzar unicidad cruzada de IMEI en BD.
6. Pruebas automatizadas con casos reales etiquetados y sin exponer IMEIs en logs.
