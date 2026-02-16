// ==============================================
// useTechnicianOffline HOOK TESTS
// ==============================================

import { renderHook, act } from '@testing-library/react';
import { useTechnicianOffline, isQueued } from '@/lib/hooks/use-technician-offline';

// Mock dependencies
const mockQueueOfflineMutation = jest.fn().mockResolvedValue({ mutationId: 'mut-123' });
const mockIsIndexedDBAvailable = jest.fn().mockReturnValue(true);

jest.mock('@/lib/offline/mutation-queue', () => ({
  queueOfflineMutation: (...args: any[]) => mockQueueOfflineMutation(...args),
}));

jest.mock('@/lib/offline/indexeddb', () => ({
  STORES: {
    CUSTOMERS: 'customers',
    JOBS: 'jobs',
    LEADS: 'leads',
    INVOICES: 'invoices',
    SYNC_META: 'sync_meta',
    MUTATION_QUEUE: 'mutation_queue',
  },
  isIndexedDBAvailable: (...args: any[]) => mockIsIndexedDBAvailable(...args),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useTechnicianOffline', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  describe('Online Behavior', () => {
    it('should call fetch directly when online for startJob', async () => {
      const { result } = renderHook(() => useTechnicianOffline());

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/jobs/job-1/start',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should call fetch directly when online for completeJob', async () => {
      const { result } = renderHook(() => useTechnicianOffline());

      await act(async () => {
        await result.current.completeJob('job-2');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/jobs/job-2/complete',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should call fetch with location for onMyWay', async () => {
      const { result } = renderHook(() => useTechnicianOffline());

      await act(async () => {
        await result.current.onMyWay('job-3', 30.25, -97.75);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/technician/on-the-way',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            jobId: 'job-3',
            latitude: 30.25,
            longitude: -97.75,
          }),
        })
      );
    });

    it('should call fetch with delay for runningLate', async () => {
      const { result } = renderHook(() => useTechnicianOffline());

      await act(async () => {
        await result.current.runningLate('job-4', 15);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/technician/running-late',
        expect.objectContaining({
          body: JSON.stringify({
            jobId: 'job-4',
            delayMinutes: 15,
          }),
        })
      );
    });

    it('should return parsed JSON response when online', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ eta: '10 min' }),
      });

      const { result } = renderHook(() => useTechnicianOffline());
      let response: any;

      await act(async () => {
        response = await result.current.onMyWay('job-5', 30.0, -97.0);
      });

      expect(response).toEqual({ eta: '10 min' });
      expect(isQueued(response)).toBe(false);
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useTechnicianOffline());

      await expect(
        act(async () => {
          await result.current.startJob('job-err');
        })
      ).rejects.toThrow('Server error');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Not JSON')),
      });

      const { result } = renderHook(() => useTechnicianOffline());

      await expect(
        act(async () => {
          await result.current.startJob('job-err2');
        })
      ).rejects.toThrow('HTTP 502');
    });
  });

  describe('Offline Behavior', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    });

    it('should queue mutation when offline for startJob', async () => {
      const { result } = renderHook(() => useTechnicianOffline());
      let response: any;

      await act(async () => {
        response = await result.current.startJob('job-offline-1');
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockQueueOfflineMutation).toHaveBeenCalledWith(
        'jobs',
        'update',
        expect.objectContaining({
          id: 'job-offline-1',
          _offlineAction: '/api/jobs/job-offline-1/start',
        }),
        'job-offline-1'
      );
      expect(response).toEqual({ queued: true, mutationId: 'mut-123' });
    });

    it('should queue mutation when offline for completeJob', async () => {
      const { result } = renderHook(() => useTechnicianOffline());

      await act(async () => {
        await result.current.completeJob('job-offline-2');
      });

      expect(mockQueueOfflineMutation).toHaveBeenCalledWith(
        'jobs',
        'update',
        expect.objectContaining({
          _offlineAction: '/api/jobs/job-offline-2/complete',
        }),
        'job-offline-2'
      );
    });

    it('should queue mutation when offline for onMyWay', async () => {
      const { result } = renderHook(() => useTechnicianOffline());

      await act(async () => {
        await result.current.onMyWay('job-offline-3', 30.25, -97.75);
      });

      expect(mockQueueOfflineMutation).toHaveBeenCalledWith(
        'jobs',
        'update',
        expect.objectContaining({
          _offlineAction: '/api/technician/on-the-way',
          _offlineBody: {
            jobId: 'job-offline-3',
            latitude: 30.25,
            longitude: -97.75,
          },
        }),
        'job-offline-3'
      );
    });

    it('should queue mutation when offline for runningLate', async () => {
      const { result } = renderHook(() => useTechnicianOffline());

      await act(async () => {
        await result.current.runningLate('job-offline-4', 10);
      });

      expect(mockQueueOfflineMutation).toHaveBeenCalledWith(
        'jobs',
        'update',
        expect.objectContaining({
          _offlineAction: '/api/technician/running-late',
          _offlineBody: {
            jobId: 'job-offline-4',
            delayMinutes: 10,
          },
        }),
        'job-offline-4'
      );
    });

    it('should return a queued result with mutationId', async () => {
      mockQueueOfflineMutation.mockResolvedValue({ mutationId: 'mut-456' });
      const { result } = renderHook(() => useTechnicianOffline());
      let response: any;

      await act(async () => {
        response = await result.current.startJob('job-offline-5');
      });

      expect(isQueued(response)).toBe(true);
      expect(response.mutationId).toBe('mut-456');
    });

    it('should throw when IndexedDB is not available', async () => {
      mockIsIndexedDBAvailable.mockReturnValue(false);
      const { result } = renderHook(() => useTechnicianOffline());

      await expect(
        act(async () => {
          await result.current.startJob('job-no-idb');
        })
      ).rejects.toThrow('offline storage is not available');
    });
  });

  describe('isQueued type guard', () => {
    it('should return true for queued results', () => {
      expect(isQueued({ queued: true, mutationId: 'abc' })).toBe(true);
    });

    it('should return false for API responses', () => {
      expect(isQueued({ success: true, eta: '10 min' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isQueued(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isQueued(undefined)).toBe(false);
    });

    it('should return false for strings', () => {
      expect(isQueued('queued')).toBe(false);
    });
  });
});
