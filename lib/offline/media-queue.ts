// =====================================================
// OFFLINE MEDIA QUEUE
// Stores photos, voice notes, and signatures for offline sync
// =====================================================

import { logger } from '@/lib/logger';

const mediaQueueLogger = logger.child({ context: 'offline.media-queue' });

// Database config
const DB_NAME = 'trades-captain-media';
const DB_VERSION = 1;
const STORE_NAME = 'media_queue';

export type MediaType = 'photo' | 'voice_note' | 'signature' | 'receipt';
export type SyncStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface QueuedMedia {
  id: string;
  type: MediaType;
  blob: Blob;
  jobId?: string;
  invoiceId?: string;
  metadata: {
    filename?: string;
    mimeType: string;
    duration?: number; // For voice notes
    photoType?: string; // For photos: receipt, parts, damage
    [key: string]: any;
  };
  createdAt: string;
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
  uploadUrl?: string; // Set after successful upload
}

// Database instance
let dbInstance: IDBDatabase | null = null;

/**
 * Open the media queue database
 */
export function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open media queue database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('jobId', 'jobId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Queue a voice note for offline sync
 */
export async function queueVoiceNote(
  audioBlob: Blob,
  jobId: string,
  metadata: { duration: number; mimeType?: string }
): Promise<string> {
  const id = generateId();
  const item: QueuedMedia = {
    id,
    type: 'voice_note',
    blob: audioBlob,
    jobId,
    metadata: {
      duration: metadata.duration,
      mimeType: metadata.mimeType || 'audio/webm',
      filename: `voice-note-${Date.now()}.webm`,
    },
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    retryCount: 0,
  };

  await putMediaItem(item);

  mediaQueueLogger.info({
    msg: 'Voice note queued for offline sync',
    id,
    jobId,
    duration: metadata.duration,
  });

  return id;
}

/**
 * Queue a photo for offline sync
 */
export async function queuePhoto(
  photoBlob: Blob,
  jobId: string,
  metadata: { photoType: string; mimeType?: string }
): Promise<string> {
  const id = generateId();
  const item: QueuedMedia = {
    id,
    type: 'photo',
    blob: photoBlob,
    jobId,
    metadata: {
      photoType: metadata.photoType,
      mimeType: metadata.mimeType || 'image/jpeg',
      filename: `photo-${Date.now()}.jpg`,
    },
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    retryCount: 0,
  };

  await putMediaItem(item);

  mediaQueueLogger.info({
    msg: 'Photo queued for offline sync',
    id,
    jobId,
    photoType: metadata.photoType,
  });

  return id;
}

/**
 * Queue a receipt photo for offline analysis
 */
export async function queueReceipt(
  photoBlob: Blob,
  jobId: string,
  metadata: { mimeType?: string }
): Promise<string> {
  const id = generateId();
  const item: QueuedMedia = {
    id,
    type: 'receipt',
    blob: photoBlob,
    jobId,
    metadata: {
      photoType: 'receipt',
      mimeType: metadata.mimeType || 'image/jpeg',
      filename: `receipt-${Date.now()}.jpg`,
      pendingAnalysis: true,
    },
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    retryCount: 0,
  };

  await putMediaItem(item);

  mediaQueueLogger.info({
    msg: 'Receipt queued for offline sync',
    id,
    jobId,
  });

  return id;
}

/**
 * Queue a signature for offline sync
 */
export async function queueSignature(
  signatureBlob: Blob,
  entityType: 'invoice' | 'job' | 'quote',
  entityId: string,
  metadata: { signerName: string; signerEmail?: string }
): Promise<string> {
  const id = generateId();
  const item: QueuedMedia = {
    id,
    type: 'signature',
    blob: signatureBlob,
    ...(entityType === 'invoice' ? { invoiceId: entityId } : { jobId: entityId }),
    metadata: {
      mimeType: 'image/png',
      filename: `signature-${Date.now()}.png`,
      entityType,
      entityId,
      signerName: metadata.signerName,
      signerEmail: metadata.signerEmail,
    },
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    retryCount: 0,
  };

  await putMediaItem(item);

  mediaQueueLogger.info({
    msg: 'Signature queued for offline sync',
    id,
    entityType,
    entityId,
  });

  return id;
}

/**
 * Get all pending media items
 */
export async function getPendingMedia(): Promise<QueuedMedia[]> {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');

    request.onerror = () => reject(new Error('Failed to get pending media'));
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get all failed media items (for retry)
 */
export async function getFailedMedia(): Promise<QueuedMedia[]> {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('syncStatus');
    const request = index.getAll('failed');

    request.onerror = () => reject(new Error('Failed to get failed media'));
    request.onsuccess = () => {
      // Filter out items with too many retries
      const items = (request.result || []).filter(
        (item: QueuedMedia) => item.retryCount < 3
      );
      resolve(items);
    };
  });
}

/**
 * Get media items by job
 */
export async function getMediaByJob(jobId: string): Promise<QueuedMedia[]> {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('jobId');
    const request = index.getAll(jobId);

    request.onerror = () => reject(new Error('Failed to get media by job'));
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Update media item status
 */
export async function updateMediaStatus(
  id: string,
  status: SyncStatus,
  options?: { error?: string; uploadUrl?: string }
): Promise<void> {
  const db = await openMediaDatabase();
  const existing = await getMediaItem(id);

  if (!existing) {
    throw new Error(`Media item not found: ${id}`);
  }

  const updated: QueuedMedia = {
    ...existing,
    syncStatus: status,
    ...(options?.error && { lastError: options.error }),
    ...(options?.uploadUrl && { uploadUrl: options.uploadUrl }),
    ...(status === 'failed' && { retryCount: existing.retryCount + 1 }),
  };

  await putMediaItem(updated);
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(id: string): Promise<void> {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(new Error('Failed to delete media item'));
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all completed items older than specified hours
 */
export async function clearOldCompletedMedia(olderThanHours: number = 24): Promise<number> {
  const db = await openMediaDatabase();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('syncStatus');
    const request = index.getAll('completed');

    request.onerror = () => reject(new Error('Failed to get completed media'));
    request.onsuccess = () => {
      const items = (request.result || []) as QueuedMedia[];
      let deleted = 0;

      for (const item of items) {
        if (item.createdAt < cutoff) {
          store.delete(item.id);
          deleted++;
        }
      }

      transaction.oncomplete = () => resolve(deleted);
    };
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  uploading: number;
  failed: number;
  completed: number;
  totalSizeBytes: number;
}> {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(new Error('Failed to get queue stats'));
    request.onsuccess = () => {
      const items = (request.result || []) as QueuedMedia[];

      const stats = {
        pending: 0,
        uploading: 0,
        failed: 0,
        completed: 0,
        totalSizeBytes: 0,
      };

      for (const item of items) {
        stats[item.syncStatus]++;
        stats.totalSizeBytes += item.blob.size;
      }

      resolve(stats);
    };
  });
}

/**
 * Sync all pending media
 * Called when coming back online
 */
export async function syncPendingMedia(
  uploadFn: (item: QueuedMedia) => Promise<string>
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingMedia();
  const failed = await getFailedMedia();
  const toSync = [...pending, ...failed];

  let synced = 0;
  let failedCount = 0;

  for (const item of toSync) {
    try {
      // Mark as uploading
      await updateMediaStatus(item.id, 'uploading');

      // Upload
      const uploadUrl = await uploadFn(item);

      // Mark as completed
      await updateMediaStatus(item.id, 'completed', { uploadUrl });
      synced++;

      mediaQueueLogger.info({
        msg: 'Media synced',
        id: item.id,
        type: item.type,
      });
    } catch (error) {
      // Mark as failed
      await updateMediaStatus(item.id, 'failed', {
        error: error instanceof Error ? error.message : 'Upload failed',
      });
      failedCount++;

      mediaQueueLogger.error({
        msg: 'Media sync failed',
        id: item.id,
        type: item.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { synced, failed: failedCount };
}

// Internal helpers

async function getMediaItem(id: string): Promise<QueuedMedia | null> {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(new Error('Failed to get media item'));
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function putMediaItem(item: QueuedMedia): Promise<void> {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onerror = () => reject(new Error('Failed to put media item'));
    request.onsuccess = () => resolve();
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
