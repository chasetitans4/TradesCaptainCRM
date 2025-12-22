// ==============================================
// VALIDATION LIBRARY TESTS
// ==============================================

import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  sanitizeFilename,
  isValidUUID,
  schemas,
  validateRequest,
} from '@/lib/validation';

describe('Validation Library', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should escape HTML entities', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should remove null bytes', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should lowercase and trim valid emails', () => {
      expect(sanitizeEmail('  TEST@Example.COM  ')).toBe('test@example.com');
    });

    it('should return null for invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBeNull();
      expect(sanitizeEmail('missing@domain')).toBeNull();
      expect(sanitizeEmail('@no-local.com')).toBeNull();
    });
  });

  describe('sanitizePhone', () => {
    it('should clean phone numbers', () => {
      expect(sanitizePhone('(555) 123-4567')).toBe('5551234567');
      expect(sanitizePhone('+1 555 123 4567')).toBe('+15551234567');
    });

    it('should return null for invalid phones', () => {
      expect(sanitizePhone('123')).toBeNull(); // Too short
      expect(sanitizePhone('12345678901234567890')).toBeNull(); // Too long
    });
  });

  describe('sanitizeURL', () => {
    it('should accept valid http/https URLs', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com/');
      expect(sanitizeURL('http://localhost:3000')).toBe('http://localhost:3000/');
    });

    it('should reject invalid protocols', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBeNull();
      expect(sanitizeURL('file:///etc/passwd')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeURL('not a url')).toBeNull();
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      expect(sanitizeFilename('my file<>.txt')).toBe('my_file_.txt');
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeFilename('my___file.txt')).toBe('my_file.txt');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('schemas', () => {
    describe('email schema', () => {
      it('should validate emails', () => {
        expect(schemas.email.safeParse('test@example.com').success).toBe(true);
        expect(schemas.email.safeParse('invalid').success).toBe(false);
      });
    });

    describe('password schema', () => {
      it('should require minimum 8 characters', () => {
        expect(schemas.password.safeParse('Short1').success).toBe(false);
      });

      it('should require uppercase letter', () => {
        expect(schemas.password.safeParse('password123').success).toBe(false);
      });

      it('should require lowercase letter', () => {
        expect(schemas.password.safeParse('PASSWORD123').success).toBe(false);
      });

      it('should require number', () => {
        expect(schemas.password.safeParse('PasswordABC').success).toBe(false);
      });

      it('should accept valid passwords', () => {
        expect(schemas.password.safeParse('Password123').success).toBe(true);
      });
    });

    describe('pagination schema', () => {
      it('should provide defaults', () => {
        const result = schemas.pagination.parse({});
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.sortOrder).toBe('desc');
      });

      it('should enforce limits', () => {
        expect(schemas.pagination.safeParse({ page: 0 }).success).toBe(false);
        expect(schemas.pagination.safeParse({ limit: 101 }).success).toBe(false);
      });
    });
  });

  describe('validateRequest', () => {
    const testSchema = schemas.email;

    it('should return success for valid data', () => {
      const result = validateRequest(testSchema, 'test@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should return errors for invalid data', () => {
      const result = validateRequest(testSchema, 'invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });
});
