import { describe, expect, it } from 'vitest';
import { BD_PHONE_REGEX, normalizeBdPhone } from '../../src/utils/phone';

describe('normalizeBdPhone', () => {
  it.each([
    ['01712345678', '01712345678'],
    ['+8801712345678', '01712345678'],
    ['8801712345678', '01712345678'],
    ['01712-345678', '01712345678'],
    ['017 1234 5678', '01712345678'],
    ['০১৭১২৩৪৫৬৭৮', '01712345678'],
  ])('turns %s into %s', (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });
});

describe('BD_PHONE_REGEX', () => {
  it('accepts mobile numbers from all operators', () => {
    for (const phone of ['01312345678', '01712345678', '01912345678']) {
      expect(BD_PHONE_REGEX.test(phone), phone).toBe(true);
    }
  });

  it('rejects landlines, short numbers and invalid prefixes', () => {
    for (const phone of ['0212345678', '0171234567', '01212345678', '017123456789']) {
      expect(BD_PHONE_REGEX.test(phone), phone).toBe(false);
    }
  });
});
