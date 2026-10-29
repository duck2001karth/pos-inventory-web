
export type SunmiLabelData = {
  imei: string;
  imei2: string;
  serialNumber: string;
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

function normalizeLine(value: string): string {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[|]/g, 'I')
    .trim();
}

export function parseSunmiLabel(
  rawText: string,
): SunmiLabelData {
  const result: SunmiLabelData = {
    imei: '',
    imei2: '',
    serialNumber: '',
  };

  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const labelPattern =
    /^(?:IME[I1L]\s*[12]|S\s*\/?\s*N)\s*[:=#.\-\s]*/i;

  function valueForLine(
    index: number,
    label: RegExp,
  ): string {
    const current = lines[index];

    const match = current.match(label);

    if (!match) return '';

    const afterLabel = current
      .slice(match[0].length)
      .replace(/^[\s:;=#.-]+/, '')
      .trim();

    if (afterLabel) return afterLabel;

    const nextLine = lines[index + 1] ?? '';

    if (labelPattern.test(nextLine)) return '';

    return nextLine;
  }

  const imei1Pattern =
    /^IME[I1L]\s*1\s*[:=#.\-\s]*/i;

  const imei2Pattern =
    /^IME[I1L]\s*2\s*[:=#.\-\s]*/i;

  const snPattern =
    /^S\s*\/?\s*N\s*[:=#.\-\s]*/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (imei1Pattern.test(line)) {
      const text = valueForLine(i, imei1Pattern);
      const digits = text.replace(/\D/g, '');

      if (digits.length === 15) {
        result.imei = digits;
      }

      continue;
    }

    if (imei2Pattern.test(line)) {
      const text = valueForLine(i, imei2Pattern);
      const digits = text.replace(/\D/g, '');

      if (digits.length === 15) {
        result.imei2 = digits;
      }

      continue;
    }

    if (snPattern.test(line)) {
      const text = valueForLine(i, snPattern);

      const candidate = text
        .split(/\s+(?=IMEI|MODEL|FCC|IC:)/)[0]
        .replace(/[^A-Z0-9-]/g, '');

      if (
        candidate.length >= 6 &&
        candidate.length <= 100
      ) {
        result.serialNumber = candidate;
      }
    }
  }

  return result;
}
