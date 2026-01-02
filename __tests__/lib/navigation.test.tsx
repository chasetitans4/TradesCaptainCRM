import { render, screen } from '@testing-library/react';
import { AddressLink } from '@/components/ui/address-link';
import {
  getNavigationUrl,
  getAppleMapsUrl,
  getSmartNavigationUrl,
  formatFullAddress,
} from '@/lib/utils/navigation';

describe('navigation utils', () => {
  it('formats full address from components', () => {
    const a1 = formatFullAddress({ address: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' });
    expect(a1).toBe('123 Main St, Austin, TX, 78701');
    const a2 = formatFullAddress({ address_line1: '456 Pine', city: 'Denver', state: 'CO', zip: null });
    expect(a2).toBe('456 Pine, Denver, CO');
    const a3 = formatFullAddress({ address: null, address_line1: null, city: null, state: null, zip: null });
    expect(a3).toBe('');
  });

  it('returns openstreetmap url when coordinates absent', () => {
    const url = getNavigationUrl('123 Main St, Austin, TX');
    expect(url).toContain('openstreetmap.org/search?query=');
  });

  it('returns openstreetmap directions url when coordinates provided', () => {
    const url = getNavigationUrl('ignored', 30.2672, -97.7431);
    expect(url).toContain('openstreetmap.org/directions');
  });

  it('returns apple maps url on iOS', () => {
    const original = navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', { value: 'iPhone', configurable: true });
    const url = getSmartNavigationUrl('123 Main St');
    expect(url).toContain('maps.apple.com');
    Object.defineProperty(window.navigator, 'userAgent', { value: original, configurable: true });
  });

  it('returns openstreetmap url on non-iOS', () => {
    const original = navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', { value: 'Chrome', configurable: true });
    const url = getSmartNavigationUrl('123 Main St');
    expect(url).toContain('openstreetmap.org');
    Object.defineProperty(window.navigator, 'userAgent', { value: original, configurable: true });
  });
});

describe('AddressLink', () => {
  it('renders anchor with formatted address', () => {
    render(
      <AddressLink address="123 Main St" city="Austin" state="TX" zip="78701" showNavigationIcon={false} />
    );
    const link = screen.getByText('123 Main St, Austin, TX, 78701').closest('a');
    expect(link).toBeTruthy();
    expect(link?.href).toContain('openstreetmap.org');
  });
});
