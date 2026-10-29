
export type PreparedImages = {
  full: HTMLCanvasElement;
  enhanced: HTMLCanvasElement;
};

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error('No se pudo abrir la fotografía.'));
      image.src = url;
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function makeCanvas(
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  return canvas;
}

export async function preprocessOcrImage(
  file: File,
): Promise<PreparedImages> {
  const image = await loadImage(file);

  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;

  if (!originalWidth || !originalHeight) {
    throw new Error('La fotografía no tiene dimensiones válidas.');
  }

  // Limitar el consumo de memoria en iPhone.
  const maxSide = 2400;
  const scale = Math.min(
    1,
    maxSide / Math.max(originalWidth, originalHeight),
  );

  const full = makeCanvas(
    originalWidth * scale,
    originalHeight * scale,
  );

  const fullContext = full.getContext('2d', {
    willReadFrequently: true,
  });

  if (!fullContext) {
    throw new Error('No se pudo preparar la fotografía.');
  }

  fullContext.fillStyle = '#ffffff';
  fullContext.fillRect(0, 0, full.width, full.height);
  fullContext.drawImage(
    image,
    0,
    0,
    full.width,
    full.height,
  );

  // Segunda versión: ampliar la imagen y mejorar
  // ligeramente el contraste sin perder las letras.
  const scaleUp = Math.min(
    1.7,
    2800 / Math.max(full.width, full.height),
  );

  const enhanced = makeCanvas(
    full.width * Math.max(1, scaleUp),
    full.height * Math.max(1, scaleUp),
  );

  const context = enhanced.getContext('2d', {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error('No se pudo mejorar la fotografía.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.filter = 'grayscale(1) contrast(1.5)';

  context.fillStyle = '#ffffff';
  context.fillRect(
    0,
    0,
    enhanced.width,
    enhanced.height,
  );

  context.drawImage(
    full,
    0,
    0,
    enhanced.width,
    enhanced.height,
  );

  context.filter = 'none';

  return { full, enhanced };
}
