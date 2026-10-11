const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export function normalizeBdPhone(input: string): string {
  const asciiDigits = input.replace(/[০-৯]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));
  const compact = asciiDigits.replace(/[\s\-()]/g, '');
  return compact.replace(/^\+?88(?=01)/, '');
}
