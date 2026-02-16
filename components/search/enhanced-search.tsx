'use client';

/**
 * Enhanced Search Component
 *
 * Per Design Constitution Section 3.15:
 * - Search-as-you-type (2 char minimum, <200ms results)
 * - Recent items (last 5-10, persisted)
 * - Voice search (Web Speech API)
 * - Barcode/QR scanning for equipment
 * - 50px touch targets
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getRecentItems,
  addRecentSearch,
  clearRecentItems,
  formatRecentTimestamp,
  type RecentItem,
  type RecentItemType,
} from '@/lib/search/recent-items';
import { isBarcodeDetectorSupported } from '@/lib/scanner/decode';
import { isVoiceInputSupported } from '@/hooks/useVoiceInput';
import { VoiceSearchButton, VoiceSearchOverlay } from './voice-search';
import { BarcodeScanner } from '../scanner/barcode-scanner';
import {
  Search,
  Mic,
  X,
  Clock,
  Briefcase,
  User,
  Wrench,
  Package,
  Scan,
  ArrowRight,
  Trash2,
} from 'lucide-react';

/**
 * Search result item
 */
export interface SearchResultItem {
  id: string;
  type: RecentItemType;
  title: string;
  subtitle?: string;
  href: string;
  matchedField?: string;
}

/**
 * Enhanced search props
 */
interface EnhancedSearchProps {
  /** Search callback - returns results */
  onSearch?: (query: string) => Promise<SearchResultItem[]>;
  /** Callback when result is selected */
  onSelect?: (item: SearchResultItem) => void;
  /** Callback when barcode is scanned */
  onBarcodeScan?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Show recent items */
  showRecent?: boolean;
  /** Show voice search button */
  showVoice?: boolean;
  /** Show barcode scan button */
  showScan?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Full enhanced search component
 */
export function EnhancedSearch({
  onSearch,
  onSelect,
  onBarcodeScan,
  placeholder = 'Search customers, jobs, equipment...',
  showRecent = true,
  showVoice = true,
  showScan = true,
  autoFocus = false,
  className,
}: EnhancedSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Feature detection
  const voiceSupported = useMemo(() => isVoiceInputSupported(), []);
  const scanSupported = useMemo(() => isBarcodeDetectorSupported(), []);

  // Load recent items
  useEffect(() => {
    if (showRecent) {
      setRecentItems(getRecentItems().slice(0, 5));
    }
  }, [showRecent, isOpen]);

  // Search debounce
  useEffect(() => {
    if (!onSearch || query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const searchResults = await onSearch(query);
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200); // <200ms per constitution

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Handle result selection
  const handleSelect = useCallback(
    (item: SearchResultItem | RecentItem) => {
      // Add to recent
      addRecentSearch(query);

      if (onSelect) {
        onSelect(item as SearchResultItem);
      } else {
        router.push(item.href);
      }

      setQuery('');
      setIsOpen(false);
    },
    [query, onSelect, router]
  );

  // Handle voice search
  const handleVoiceSearch = useCallback((transcript: string) => {
    setQuery(transcript);
    setShowVoiceOverlay(false);
    inputRef.current?.focus();
  }, []);

  // Handle barcode scan
  const handleScan = useCallback(
    (result: { rawValue: string }, parsed: { value: string }) => {
      setShowScanner(false);
      if (onBarcodeScan) {
        onBarcodeScan(result.rawValue);
      } else {
        setQuery(parsed.value);
      }
    },
    [onBarcodeScan]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  // Handle clear recent
  const handleClearRecent = useCallback(() => {
    clearRecentItems();
    setRecentItems([]);
  }, []);

  // Get icon for item type
  const getTypeIcon = (type: RecentItemType) => {
    switch (type) {
      case 'job':
        return <Briefcase className="h-4 w-4 text-primary" />;
      case 'customer':
        return <User className="h-4 w-4 text-info" />;
      case 'equipment':
        return <Wrench className="h-4 w-4 text-warning" />;
      case 'part':
        return <Package className="h-4 w-4 text-success" />;
      case 'search':
        return <Search className="h-4 w-4 text-text-muted" />;
      default:
        return <Search className="h-4 w-4 text-text-muted" />;
    }
  };

  // Show dropdown when focused and has content
  const showDropdown = isFocused && (query.length > 0 || recentItems.length > 0);

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div
        className={cn(
          'flex items-center gap-2 h-[50px] px-3 bg-background border border-border rounded-xl',
          'transition-all',
          isFocused && 'ring-2 ring-primary/50 border-primary'
        )}
      >
        <Search className="h-5 w-5 text-text-muted shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onBlur={() => {
            // Delay to allow click on dropdown
            setTimeout(() => {
              setIsFocused(false);
              setIsOpen(false);
            }, 200);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'flex-1 h-full bg-transparent text-text',
            'placeholder:text-text-muted',
            'focus:outline-none',
            'min-w-0'
          )}
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={handleClear}
            className="p-2 text-text-muted hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Voice search */}
        {showVoice && voiceSupported && (
          <button
            onClick={() => setShowVoiceOverlay(true)}
            className="p-2 text-text-muted hover:text-primary"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}

        {/* Barcode scan */}
        {showScan && scanSupported && (
          <button
            onClick={() => setShowScanner(true)}
            className="p-2 text-text-muted hover:text-primary"
          >
            <Scan className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-3 text-sm text-text-muted">
              Searching...
            </div>
          )}

          {/* Search results */}
          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left min-h-[50px]"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-sm text-text-muted truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-muted shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-text-muted">
              No results for &quot;{query}&quot;
            </div>
          )}

          {/* Recent items */}
          {!isLoading && query.length < 2 && recentItems.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted uppercase">
                  Recent
                </span>
                <button
                  onClick={handleClearRecent}
                  className="p-1 text-text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {recentItems.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left min-h-[50px]"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{item.title}</p>
                    <p className="text-xs text-text-muted">
                      {formatRecentTimestamp(item.timestamp)}
                    </p>
                  </div>
                  {getTypeIcon(item.type)}
                </button>
              ))}
            </div>
          )}

          {/* Type to search hint */}
          {!isLoading && query.length > 0 && query.length < 2 && (
            <div className="px-4 py-3 text-sm text-text-muted">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}

      {/* Voice overlay */}
      {showVoiceOverlay && (
        <VoiceSearchOverlay
          onSearch={handleVoiceSearch}
          onCancel={() => setShowVoiceOverlay(false)}
          placeholder="Try 'Find customer John'"
        />
      )}

      {/* Barcode scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

/**
 * Compact search bar for headers
 */
interface CompactSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function CompactSearch({
  onSearch,
  placeholder = 'Search...',
  className,
}: CompactSearchProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        addRecentSearch(query.trim());
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-[50px] pl-10 pr-4 bg-background border border-border rounded-xl',
          'text-text placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-primary/50'
        )}
      />
    </form>
  );
}

/**
 * Search action buttons for empty search box
 */
export function SearchActions({
  onVoiceSearch,
  onScan,
  className,
}: {
  onVoiceSearch?: () => void;
  onScan?: () => void;
  className?: string;
}) {
  const voiceSupported = isVoiceInputSupported();
  const scanSupported = isBarcodeDetectorSupported();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {voiceSupported && onVoiceSearch && (
        <Button
          variant="outline"
          onClick={onVoiceSearch}
          className="min-h-[50px] gap-2"
        >
          <Mic className="h-5 w-5" />
          Voice
        </Button>
      )}
      {scanSupported && onScan && (
        <Button
          variant="outline"
          onClick={onScan}
          className="min-h-[50px] gap-2"
        >
          <Scan className="h-5 w-5" />
          Scan
        </Button>
      )}
    </div>
  );
}
