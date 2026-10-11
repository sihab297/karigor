const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/** A Bangladeshi mobile number in our standard form: 11 digits starting with 013–019. */
export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

/**
 * Turns the common ways people type a Bangladeshi mobile number into 01XXXXXXXXX.
 * Handles Bangla digits, spaces, dashes and the +88 / 88 country code.
 */
export function normalizeBdPhone(input: string): string {
  const asciiDigits = input.replace(/[০-৯]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));
  const compact = asciiDigits.replace(/[\s\-()]/g, '');
  return compact.replace(/^\+?88(?=01)/, '');
}
