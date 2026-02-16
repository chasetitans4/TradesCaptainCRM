/**
 * Recent Items Persistence
 *
 * Per Design Constitution Section 3.15.1:
 * - Search-as-you-type (2 char minimum)
 * - Recent items persisted in localStorage
 * - Last 5-10 items shown
 */

const STORAGE_KEY = 'tc_recent_items';
const MAX_ITEMS = 10;

/**
 * Recent item types
 */
export type RecentItemType = 'job' | 'customer' | 'equipment' | 'part' | 'search';

/**
 * Recent item structure
 */
export interface RecentItem {
  /** Unique identifier */
  id: string;
  /** Item type */
  type: RecentItemType;
  /** Display title */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Link to navigate to */
  href: string;
  /** Timestamp when accessed */
  timestamp: number;
  /** Optional icon name */
  icon?: string;
}

/**
 * Get all recent items
 */
export function getRecentItems(): RecentItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const items: RecentItem[] = JSON.parse(stored);

    // Sort by most recent first
    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to get recent items:', error);
    return [];
  }
}

/**
 * Get recent items by type
 */
export function getRecentItemsByType(type: RecentItemType): RecentItem[] {
  return getRecentItems().filter((item) => item.type === type);
}

/**
 * Add an item to recent items
 */
export function addRecentItem(item: Omit<RecentItem, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const items = getRecentItems();

    // Remove existing entry for same item (to move to top)
    const filtered = items.filter(
      (existing) => !(existing.type === item.type && existing.id === item.id)
    );

    // Add new item at the beginning
    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now(),
    };

    filtered.unshift(newItem);

    // Limit to max items
    const limited = filtered.slice(0, MAX_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to add recent item:', error);
  }
}

/**
 * Remove a specific item
 */
export function removeRecentItem(type: RecentItemType, id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const items = getRecentItems();
    const filtered = items.filter(
      (item) => !(item.type === type && item.id === id)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove recent item:', error);
  }
}

/**
 * Clear all recent items
 */
export function clearRecentItems(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear recent items:', error);
  }
}

/**
 * Clear recent items by type
 */
export function clearRecentItemsByType(type: RecentItemType): void {
  if (typeof window === 'undefined') return;

  try {
    const items = getRecentItems();
    const filtered = items.filter((item) => item.type !== type);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to clear recent items by type:', error);
  }
}

/**
 * Add a search query to recent items
 */
export function addRecentSearch(query: string): void {
  if (!query || query.length < 2) return;

  addRecentItem({
    id: `search_${query.toLowerCase().replace(/\s+/g, '_')}`,
    type: 'search',
    title: query,
    href: `/search?q=${encodeURIComponent(query)}`,
    icon: 'search',
  });
}

/**
 * Get recent searches
 */
export function getRecentSearches(limit = 5): string[] {
  return getRecentItemsByType('search')
    .slice(0, limit)
    .map((item) => item.title);
}

/**
 * Add a job to recent items
 */
export function addRecentJob(job: {
  id: string;
  title: string;
  customerName?: string;
}): void {
  addRecentItem({
    id: job.id,
    type: 'job',
    title: job.title,
    subtitle: job.customerName,
    href: `/jobs/${job.id}`,
    icon: 'briefcase',
  });
}

/**
 * Add a customer to recent items
 */
export function addRecentCustomer(customer: {
  id: string;
  name: string;
  phone?: string;
}): void {
  addRecentItem({
    id: customer.id,
    type: 'customer',
    title: customer.name,
    subtitle: customer.phone,
    href: `/customers/${customer.id}`,
    icon: 'user',
  });
}

/**
 * Add equipment to recent items
 */
export function addRecentEquipment(equipment: {
  id: string;
  name: string;
  serialNumber?: string;
}): void {
  addRecentItem({
    id: equipment.id,
    type: 'equipment',
    title: equipment.name,
    subtitle: equipment.serialNumber,
    href: `/equipment/${equipment.id}`,
    icon: 'wrench',
  });
}

/**
 * Format timestamp for display
 */
export function formatRecentTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
