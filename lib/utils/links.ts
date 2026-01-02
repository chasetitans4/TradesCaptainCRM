/**
 * Generate tel: link
 */
export function getTelLink(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `tel:+1${cleaned}`;
}

/**
 * Generate sms: link
 */
export function getSmsLink(phone: string, body?: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const base = `sms:+1${cleaned}`;
  if (body) {
    return `${base}?body=${encodeURIComponent(body)}`;
  }
  return base;
}

/**
 * Get OpenStreetMap navigation URL
 */
export function getNavigationUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://www.openstreetmap.org/search?query=${encoded}`;
}
