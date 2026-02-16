// ==============================================
// useOnlineStatus HOOK TESTS
// ==============================================

import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';

// Mock the mutation-queue module
const mockSubscribeSyncEvents = jest.fn(() => jest.fn());
const mockProcessMutationQueue = jest.fn().mockResolvedValue({ synced: 0, failed: 0 });
const mockGetPendingMutationCount = jest.fn().mockResolvedValue(0);
const mockRegisterNetworkListeners = jest.fn(() => jest.fn());

jest.mock('@/lib/offline/mutation-queue', () => ({
  subscribeSyncEvents: (...args: any[]) => mockSubscribeSyncEvents(...args),
  processMutationQueue: (...args: any[]) => mockProcessMutationQueue(...args),
  getPendingMutationCount: (...args: any[]) => mockGetPendingMutationCount(...args),
  registerNetworkListeners: (...args: any[]) => mockRegisterNetworkListeners(...args),
}));

describe('useOnlineStatus', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    jest.clearAllMocks();
    mockGetPendingMutationCount.mockResolvedValue(0);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  describe('Initial State', () => {
    it('should start as online when navigator.onLine is true', () => {
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.isOnline).toBe(true);
    });

    it('should start as offline when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.isOnline).toBe(false);
    });

    it('should start with zero pending count', () => {
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.pendingCount).toBe(0);
    });

    it('should start not syncing', () => {
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.isSyncing).toBe(false);
    });

    it('should start with no sync error', () => {
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.lastSyncError).toBeNull();
    });
  });

  describe('Online/Offline Events', () => {
    it('should update to offline when offline event fires', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update to online when online event fires', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      const { result } = renderHook(() => useOnlineStatus());

      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('Sync Events', () => {
    it('should subscribe to sync events on mount', () => {
      renderHook(() => useOnlineStatus());
      expect(mockSubscribeSyncEvents).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeSyncEvents.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useOnlineStatus());
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update pending count on mutation_queued event', async () => {
      let syncCallback: (event: any) => void = () => {};
      mockSubscribeSyncEvents.mockImplementation((cb: any) => {
        syncCallback = cb;
        return jest.fn();
      });

      const { result } = renderHook(() => useOnlineStatus());

      // Wait for effects to settle
      await act(async () => {});

      await act(async () => {
        syncCallback({ type: 'mutation_queued', pendingCount: 3 });
      });

      expect(result.current.pendingCount).toBe(3);
    });

    it('should set syncing on sync_started event', async () => {
      let syncCallback: (event: any) => void = () => {};
      mockSubscribeSyncEvents.mockImplementation((cb: any) => {
        syncCallback = cb;
        return jest.fn();
      });

      const { result } = renderHook(() => useOnlineStatus());
      await act(async () => {});

      await act(async () => {
        syncCallback({ type: 'sync_started' });
      });

      expect(result.current.isSyncing).toBe(true);
      expect(result.current.lastSyncError).toBeNull();
    });

    it('should clear syncing and update count on sync_completed', async () => {
      let syncCallback: (event: any) => void = () => {};
      mockSubscribeSyncEvents.mockImplementation((cb: any) => {
        syncCallback = cb;
        return jest.fn();
      });

      const { result } = renderHook(() => useOnlineStatus());
      await act(async () => {});

      await act(async () => {
        syncCallback({ type: 'sync_started' });
      });

      await act(async () => {
        syncCallback({ type: 'sync_completed', pendingCount: 0 });
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.pendingCount).toBe(0);
    });

    it('should set error on sync_failed event', async () => {
      let syncCallback: (event: any) => void = () => {};
      mockSubscribeSyncEvents.mockImplementation((cb: any) => {
        syncCallback = cb;
        return jest.fn();
      });

      const { result } = renderHook(() => useOnlineStatus());
      await act(async () => {});

      await act(async () => {
        syncCallback({ type: 'sync_failed', pendingCount: 2, error: 'Network error' });
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.pendingCount).toBe(2);
      expect(result.current.lastSyncError).toBe('Network error');
    });
  });

  describe('Network Listeners', () => {
    it('should register network listeners on mount', () => {
      renderHook(() => useOnlineStatus());
      expect(mockRegisterNetworkListeners).toHaveBeenCalled();
    });

    it('should clean up network listeners on unmount', () => {
      const mockCleanup = jest.fn();
      mockRegisterNetworkListeners.mockReturnValue(mockCleanup);

      const { unmount } = renderHook(() => useOnlineStatus());
      unmount();

      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('triggerSync', () => {
    it('should call processMutationQueue when online', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockProcessMutationQueue).toHaveBeenCalled();
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      const { result } = renderHook(() => useOnlineStatus());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockProcessMutationQueue).not.toHaveBeenCalled();
    });

    it('should update pending count after sync', async () => {
      mockGetPendingMutationCount.mockResolvedValue(0);
      const { result } = renderHook(() => useOnlineStatus());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(result.current.pendingCount).toBe(0);
    });
  });
});
