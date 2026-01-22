'use client';

// =====================================================
// IMAGE UPLOADER COMPONENT
// Handles image uploads with compression progress
// Shows thumbnails after successful upload
// =====================================================

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadedImage {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  compressedUrl: string;
  name: string;
  size: number;
  originalSize: number;
  width: number;
  height: number;
}

interface ImageUploaderProps {
  issueId: string;
  maxFiles?: number;
  maxVideos?: number;
  existingCount?: number;
  existingVideoCount?: number;
  onUploadComplete?: (image: UploadedImage) => void;
  onDelete?: (imageId: string) => void;
  className?: string;
}

// Video limits
const MAX_VIDEO_SIZE_MB = 10;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface FileUpload {
  id: string;
  file: File;
  state: UploadState;
  progress: number;
  error?: string;
  result?: UploadedImage;
  preview?: string;
}

export function ImageUploader({
  issueId,
  maxFiles = 10,
  maxVideos = 2,
  existingCount = 0,
  existingVideoCount = 0,
  onUploadComplete,
  onDelete,
  className,
}: ImageUploaderProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const successfulUploads = uploads.filter(u => u.state === 'success');
  const remainingSlots = maxFiles - existingCount - successfulUploads.length;
  const remainingVideoSlots = maxVideos - existingVideoCount - successfulUploads.filter(u => u.file.type.startsWith('video/')).length;

  const updateUpload = useCallback((id: string, updates: Partial<FileUpload>) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const uploadFile = useCallback(async (fileUpload: FileUpload) => {
    const { id, file } = fileUpload;

    updateUpload(id, { state: 'uploading', progress: 10 });

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      updateUpload(id, { progress: 30 });

      // Upload to API
      const response = await fetch(`/api/portal/issues/${issueId}/media/upload`, {
        method: 'POST',
        body: formData,
      });

      updateUpload(id, { state: 'processing', progress: 70 });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      updateUpload(id, {
        state: 'success',
        progress: 100,
        result: {
          id: data.media.id,
          thumbnailUrl: data.media.thumbnailUrl,
          previewUrl: data.media.previewUrl,
          compressedUrl: data.media.url,
          name: data.media.name,
          size: data.media.size,
          originalSize: data.media.originalSize,
          width: data.media.width,
          height: data.media.height,
        },
      });

      if (onUploadComplete && data.media) {
        onUploadComplete({
          id: data.media.id,
          thumbnailUrl: data.media.thumbnailUrl,
          previewUrl: data.media.previewUrl,
          compressedUrl: data.media.url,
          name: data.media.name,
          size: data.media.size,
          originalSize: data.media.originalSize,
          width: data.media.width,
          height: data.media.height,
        });
      }
    } catch (error) {
      updateUpload(id, {
        state: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }, [issueId, updateUpload, onUploadComplete]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    let videoCount = 0;

    const validFiles = fileArray.filter(file => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        return false;
      }

      const isVideo = file.type.startsWith('video/');

      // Video-specific validation
      if (isVideo) {
        // Check video count limit
        if (videoCount >= remainingVideoSlots) {
          return false;
        }
        // Check video size limit (10MB)
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          return false;
        }
        videoCount++;
      } else {
        // Image size limit (50MB)
        if (file.size > 50 * 1024 * 1024) {
          return false;
        }
      }

      return true;
    });

    // Limit to remaining slots
    const filesToUpload = validFiles.slice(0, remainingSlots);

    if (filesToUpload.length === 0) return;

    // Create upload entries with local previews
    const newUploads: FileUpload[] = filesToUpload.map(file => {
      const id = crypto.randomUUID();
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      return {
        id,
        file,
        state: 'idle' as const,
        progress: 0,
        preview,
      };
    });

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploads
    newUploads.forEach(upload => {
      uploadFile(upload);
    });
  }, [remainingSlots, uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeUpload = useCallback((id: string, imageId?: string) => {
    const upload = uploads.find(u => u.id === id);
    if (upload?.preview) {
      URL.revokeObjectURL(upload.preview);
    }

    setUploads(prev => prev.filter(u => u.id !== id));

    // If successfully uploaded, notify parent to delete from server
    if (imageId && onDelete) {
      onDelete(imageId);
    }
  }, [uploads, onDelete]);

  const retryUpload = useCallback((upload: FileUpload) => {
    updateUpload(upload.id, { state: 'idle', progress: 0, error: undefined });
    uploadFile(upload);
  }, [updateUpload, uploadFile]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      {remainingSlots > 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Images (JPEG, PNG, GIF, WebP) up to 50MB
          </p>
          <p className="text-xs text-gray-500">
            Videos (MP4, MOV, WebM) up to {MAX_VIDEO_SIZE_MB}MB, max {maxVideos} videos
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {remainingSlots} of {maxFiles} slots remaining
            {remainingVideoSlots < maxVideos && ` (${remainingVideoSlots} video slots left)`}
          </p>
        </div>
      )}

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(upload => (
            <div
              key={upload.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                upload.state === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
              )}
            >
              {/* Preview/Icon */}
              <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                {upload.preview ? (
                  <img
                    src={upload.result?.thumbnailUrl || upload.preview}
                    alt={upload.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {upload.state === 'uploading' && (
                    <>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{upload.progress}%</span>
                    </>
                  )}
                  {upload.state === 'processing' && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Compressing...
                    </span>
                  )}
                  {upload.state === 'success' && upload.result && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Saved ({Math.round((1 - upload.result.size / upload.result.originalSize) * 100)}% smaller)
                    </span>
                  )}
                  {upload.state === 'error' && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {upload.error}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {upload.state === 'error' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => retryUpload(upload)}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                )}
                <button
                  onClick={() => removeUpload(upload.id, upload.result?.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
