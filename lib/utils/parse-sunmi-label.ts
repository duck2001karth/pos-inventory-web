
export type SunmiLabelData = {
  imei: string;
  imei2: string;
  serialNumber: string;
  brand: string;
  model: string;
  meid?: string;
};

export function isValidImei(value: string): boolean {
  if (!/^\d{15}$/.test(value)) return false;

  let sum = 0;

  for (let i = 0; i < 15; i++) {
    let digit = Number(value[14 - i]);

    if (i % 2 === 1) {
      digit *= 2;

      if (digit > 9) digit -= 9;
    }

    sum += digit;
  }

  return sum % 10 === 0;
}

function normalizeLine(text: string): string {
  return text
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[|]/g, 'I')
    .trim();
}

function extractImei(
  lines: string[],
  lineIndex: number,
  label: RegExp,
): string {
  const match = lines[lineIndex].match(label);

  if (!match || match.index === undefined) {
    return '';
  }

  let digits = lines[lineIndex]
    .slice(match.index + match[0].length)
    .replace(/\D/g, '');

  // OCR puede dividir los 15 dígitos en dos líneas.
  for (
    let i = lineIndex + 1;
    i < Math.min(lines.length, lineIndex + 3);
    i++
  ) {
    if (digits.length >= 15) break;

    const next = lines[i].trim();

    // Solo unimos líneas compuestas por números y espacios.
    if (!/^[0-9\s]+$/.test(next)) break;

    const part = next.replace(/\D/g, '');

    if (digits.length + part.length > 15) break;

    digits += part;
  }

  return /^\d{15}$/.test(digits) ? digits : '';
}

function extractSerial(
  lines: string[],
  lineIndex: number,
  label: RegExp,
): string {
  const line = lines[lineIndex];
  const match = line.match(label);

  if (!match || match.index === undefined) return '';

  let value = line
    .slice(match.index + match[0].length)
    .trim()
    .replace(/^[\s:;=.#-]+/, '');

  if (!value) {
    const next = lines[lineIndex + 1] ?? '';

    if (/^[A-Z0-9-]{6,100}$/.test(next)) {
      value = next;
    }
  }

  const serial = value
    .split(/\s+(?=IMEI|MEID|MODEL|FCC|IC\b)/)[0]
    .replace(/[^A-Z0-9-]/g, '');

  return /^[A-Z0-9-]{6,100}$/.test(serial)
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

  const combined = lines.join(' ');

  const data: SunmiLabelData = {
    imei: '',
    imei2: '',
    serialNumber: '',
    brand: '',
    model: '',
    meid: '',
  };

  if (/\bSUNMI\b/.test(combined)) {
    data.brand = 'SUNMI';
  }

  // Priorizar el código de modelo impreso.
  if (/\bT5921\b/.test(combined)) {
    data.model = 'V2 PRO / T5921';
  } else if (/\bT5940\b/.test(combined)) {
    data.model = 'V2s / T5940';
  } else if (/\bV2\s*PRO\b/.test(combined)) {
    data.model = 'V2 PRO';
  } else if (/\bV2S\b/.test(combined)) {
    data.model = 'V2s';
  }

  const imei1Pattern = /\bIME[I1L]\s*1?\s*[:=#.-]*/i;
  const imei2Pattern = /\bIME[I1L]\s*2\s*[:=#.-]*/i;
  const serialPattern = /\bS\s*\/?\s*N\s*[:=#.-]*/i;
  const meidPattern = /\bMEID\s*[:=#.-]*/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Evaluar IMEI2 antes de IMEI1.
    if (imei2Pattern.test(line)) {
      data.imei2 ||= extractImei(
        lines,
        i,
        imei2Pattern,
      );
      continue;
    }

    if (imei1Pattern.test(line)) {
      data.imei ||= extractImei(
        lines,
        i,
        imei1Pattern,
      );
      continue;
    }

    if (serialPattern.test(line)) {
      data.serialNumber ||= extractSerial(
        lines,
        i,
        serialPattern,
      );
      continue;
    }

    const meidMatch = line.match(meidPattern);

    if (meidMatch && meidMatch.index !== undefined) {
      const value = line
        .slice(meidMatch.index + meidMatch[0].length)
        .replace(/[^A-Z0-9]/g, '');

      if (/^[A-F0-9]{14}$/.test(value)) {
        data.meid = value;
      }
    }
  }

  return data;
}
