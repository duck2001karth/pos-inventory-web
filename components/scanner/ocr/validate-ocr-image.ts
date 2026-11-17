/** Validación de entrada local: el MIME del navegador NO es una prueba de formato. */
export const OCR_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const OCR_MAX_IMAGE_PIXELS = 40_000_000;

export async function validateOcrImage(file: File): Promise<void> {
  if (!(file instanceof File)) throw new Error('Selecciona una fotografía válida.');
  if (file.size < 64) throw new Error('La fotografía está vacía o incompleta.');
  if (file.size > OCR_MAX_IMAGE_BYTES) throw new Error('La fotografía supera el límite de 12 MB.');

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value);
  const webp = [82, 73, 70, 70].every((value, index) => signature[index] === value) &&
    [87, 69, 66, 80].every((value, index) => signature[index + 8] === value);

  if (!jpg && !png && !webp) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WebP; no se admiten SVG ni archivos renombrados.');
  }
  // Algunos dispositivos no informan MIME; si lo hacen, debe coincidir con la firma.
  const expected = jpg ? 'image/jpeg' : png ? 'image/png' : 'image/webp';
  if (file.type && file.type !== expected && file.type !== 'application/octet-stream') {
    throw new Error('El tipo de archivo no coincide con su contenido.');
  }
}
