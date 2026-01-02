import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  isValidUUID,
  schemas,
  validateRequest,
  formatZodErrors,
  createValidator,
} from '@/lib/validation';
import { z } from 'zod';

describe('validation utilities', () => {
  it('sanitizeString strips dangerous characters and trims', () => {
    const input = '  <script>alert(1)</script>  ';
    const out = sanitizeString(input);
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out.startsWith(' ')).toBe(false);
    expect(out.endsWith(' ')).toBe(false);
  });

  it('sanitizeEmail validates correct email and rejects invalid', () => {
    expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    expect(sanitizeEmail('bad-email')).toBeNull();
  });

  it('sanitizePhone keeps + and digits, validates length', () => {
    expect(sanitizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    expect(sanitizePhone('123')).toBeNull();
  });

  it('sanitizeURL allows http/https and rejects others', () => {
    expect(sanitizeURL('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
    expect(sanitizeURL('ftp://example.com')).toBeNull();
    expect(sanitizeURL('not-a-url')).toBeNull();
  });

  it('isValidUUID detects proper uuid format', () => {
    const valid = '123e4567-e89b-12d3-a456-426614174000';
    const invalid = '123e4567-e89b-12d3-a456-42661417400Z';
    expect(isValidUUID(valid)).toBe(true);
    expect(isValidUUID(invalid)).toBe(false);
  });

  it('validateRequest returns success or formatted errors', () => {
    const schema = z.object({ name: z.string().min(2), age: z.number().min(18) });
    const ok = validateRequest(schema, { name: 'Joe', age: 20 });
    expect(ok.success).toBe(true);
    const bad = validateRequest(schema, { name: 'J', age: 5 }) as any;
    expect(bad.success).toBe(false);
    const formatted = formatZodErrors(bad.errors);
    expect(formatted).toHaveProperty('name');
    expect(formatted).toHaveProperty('age');
  });

  it('createValidator throws on invalid and returns typed data on valid', () => {
    const schema = z.object({ email: schemas.email, password: schemas.password });
    const validate = createValidator(schema);
    expect(() => validate({ email: 'bad', password: 'short' })).toThrow();
    const data = validate({ email: 'ok@example.com', password: 'Abcdefg1' });
    expect(data.email).toBe('ok@example.com');
  });
});
