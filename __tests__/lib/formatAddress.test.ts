import { formatAddress } from '@/lib/utils';

describe('formatAddress', () => {
  it('formats full address with state and zip', () => {
    const addr = formatAddress('123 Main St', 'Austin', 'TX', '78701');
    expect(addr).toBe('123 Main St, Austin, TX 78701');
  });

  it('formats address without zip', () => {
    const addr = formatAddress('456 Pine Ave', 'Denver', 'CO', null);
    expect(addr).toBe('456 Pine Ave, Denver, CO');
  });

  it('formats address with zip only', () => {
    const addr = formatAddress('789 Oak Blvd', 'Miami', null, '33101');
    expect(addr).toBe('789 Oak Blvd, Miami, 33101');
  });

  it('returns empty string when all parts missing', () => {
    const addr = formatAddress(null, null, null, null);
    expect(addr).toBe('');
  });
}
) 
