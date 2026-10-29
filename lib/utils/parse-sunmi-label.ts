
export type SunmiLabelData = {
  imei: string;
  imei2: string;
  serialNumber: string;
  brand: string;
  model: string;
};

export function isValidImei(value: string): boolean {
  if (!/^\d{15}$/.test(value)) return false;

  let sum = 0;

  for (let i = 0; i < value.length; i++) {
    let digit = Number(value[value.length - 1 - i]);

    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
  }

  return sum % 10 === 0;
}

function normalizeLine(value: string): string {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[｜|]/g, 'I')
    .trim();
}

function readDigits(
  lines: string[],
  start: number,
  label: RegExp,
): string {
  const match = lines[start].match(label);

  if (!match || match.index === undefined) {
    return '';
  }

  // Tomar solamente el texto posterior a la etiqueta.
  let current = lines[start]
    .slice(match.index + match[0].length)
    .replace(/^[\s:;=.#-]+/, '')
    .trim();

  let digits = current.replace(/\D/g, '');

  // Si Tesseract dividió el IMEI, unir las líneas
  // siguientes solamente cuando contienen dígitos.
  for (
    let index = start + 1;
    index < Math.min(start + 3, lines.length) &&
    digits.length < 15;
    index++
  ) {
    const next = lines[index].trim();

    if (!/^[0-9\s]+$/.test(next)) {
      break;
    }

    const nextDigits = next.replace(/\D/g, '');

    if (digits.length + nextDigits.length > 15) {
      break;
    }

    digits += nextDigits;
  }

  return /^\d{15}$/.test(digits) ? digits : '';
}

function readSerial(
  lines: string[],
  start: number,
  label: RegExp,
): string {
  const match = lines[start].match(label);

  if (!match || match.index === undefined) {
    return '';
  }

  let value = lines[start]
    .slice(match.index + match[0].length)
    .replace(/^[\s:;=.#-]+/, '')
    .trim();

  if (!value) {
    const next = lines[start + 1] ?? '';

    if (/^[A-Z0-9-]{6,100}$/.test(next)) {
      value = next;
    }
  }

  const serial = value
    .split(/\s+(?=IMEI|MODEL|FCC|IC\b)/)[0]
    .replace(/[^A-Z0-9-]/g, '');

  return serial.length >= 6 &&
    serial.length <= 100
    ? serial
    : '';
}

export function parseSunmiLabel(
  rawText: string,
): SunmiLabelData {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const result: SunmiLabelData = {
    imei: '',
    imei2: '',
    serialNumber: '',
    brand: '',
    model: '',
  };

  const imei1Pattern =
    /\bIME[I1L]\s*1\s*[:=#.-]*/i;

  const imei2Pattern =
    /\bIME[I1L]\s*2\s*[:=#.-]*/i;

  const serialPattern =
    /\b(?:S\s*\/\s*N|S\s*N)\s*[:=#.-]*/i;

  const combined = lines.join(' ');

  if (/\bSUNMI\b/i.test(combined)) {
    result.brand = 'SUNMI';
  }

  const modelMatch = combined.match(
    /\b(?:MODEL\s*[:=#.-]?\s*)?(T5940)\b/i,
  );

  if (modelMatch) {
    result.model = 'V2s / T5940';
  } else if (/\bV2S\b/i.test(combined)) {
    result.model = 'V2s';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      !result.imei &&
      imei1Pattern.test(line)
    ) {
      result.imei = readDigits(
        lines,
        i,
        imei1Pattern,
      );
    }

    if (
      !result.imei2 &&
      imei2Pattern.test(line)
    ) {
      result.imei2 = readDigits(
        lines,
        i,
        imei2Pattern,
      );
    }

    if (
      !result.serialNumber &&
      serialPattern.test(line)
    ) {
      result.serialNumber = readSerial(
        lines,
        i,
        serialPattern,
      );
    }
  }

  return result;
}
