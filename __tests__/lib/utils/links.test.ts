import { describe, it, expect } from '@jest/globals';

describe('utils/links', () => {
  it('getTelLink formats tel link', () => {
    const { getTelLink } = require('@/lib/utils/links');
    expect(getTelLink('(555) 123-4567')).toBe('tel:+15551234567');
  });

  it('getSmsLink formats sms link with optional body', () => {
    const { getSmsLink } = require('@/lib/utils/links');
    expect(getSmsLink('555-123-4567')).toBe('sms:+15551234567');
    expect(getSmsLink('555-123-4567', 'hello world')).toBe('sms:+15551234567?body=hello%20world');
  });

  it('getNavigationUrl returns OpenStreetMap URL', () => {
    const { getNavigationUrl } = require('@/lib/utils/links');
    expect(getNavigationUrl('123 Main, City')).toBe('https://www.openstreetmap.org/search?query=123%20Main%2C%20City');
  });
});

