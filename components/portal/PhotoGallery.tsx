'use client';

// =====================================================
// PHOTO GALLERY COMPONENT
// Displays customer photos with thumbnail previews
// Loads full-resolution on demand when clicked
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GalleryImage {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  compressedUrl: string;
  width: number;
  height: number;
  category?: string;
  uploadedAt?: string;
}

interface PhotoGalleryProps {
  images: GalleryImage[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
  columns?: 3 | 4 | 5 | 6;
}

export function PhotoGallery({
  images,
  loading = false,
  onLoadMore,
  hasMore = false,
  className,
  columns = 4,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [fullResUrl, setFullResUrl] = useState<string | null>(null);
  const [loadingFullRes, setLoadingFullRes] = useState(false);
  const [zoom, setZoom] = useState(1);

  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;

      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          navigatePrev();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        case '+':
        case '=':
          setZoom((z) => Math.min(z + 0.25, 3));
          break;
        case '-':
          setZoom((z) => Math.max(z - 0.25, 0.5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, images.length]);

  const openLightbox = useCallback(async (index: number) => {
    setSelectedIndex(index);
    setZoom(1);
    setFullResUrl(null);

    // Load preview immediately
    const image = images[index];
    if (!image) return;

    // Show preview first, then load full-res
    setLoadingFullRes(true);
    try {
      // Request full resolution from API
      const response = await fetch(`/api/portal/images/${image.id}?resolution=original`);
      if (response.ok) {
        const data = await response.json();
        setFullResUrl(data.url);
      }
    } catch (error) {
      console.error('Failed to load full-res image:', error);
    } finally {
      setLoadingFullRes(false);
    }
  }, [images]);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    setFullResUrl(null);
    setZoom(1);
  }, []);

  const navigatePrev = useCallback(() => {
    if (selectedIndex === null || selectedIndex === 0) return;
    openLightbox(selectedIndex - 1);
  }, [selectedIndex, openLightbox]);

  const navigateNext = useCallback(() => {
    if (selectedIndex === null || selectedIndex === images.length - 1) return;
    openLightbox(selectedIndex + 1);
  }, [selectedIndex, images.length, openLightbox]);

  const downloadImage = useCallback(async () => {
    if (selectedIndex === null) return;
    const image = images[selectedIndex];
    const url = fullResUrl || image.compressedUrl;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `image-${image.id}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [selectedIndex, images, fullResUrl]);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className={cn('space-y-4', className)}>
        <div className={cn('grid gap-2', gridCols[columns])}>
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => openLightbox(index)}
              className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {/* Thumbnail */}
              <img
                src={image.thumbnailUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Load more button */}
        {hasMore && !loading && onLoadMore && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onLoadMore}>
              Load More Photos
            </Button>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No photos yet
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
            aria-label="Close"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation - Previous */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigatePrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10"
              aria-label="Previous"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Navigation - Next */}
          {selectedIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10"
              aria-label="Next"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}

          {/* Image container */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Show preview while loading full-res */}
            <img
              src={fullResUrl || selectedImage.previewUrl}
              alt={`Photo ${selectedIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            />

            {/* Loading indicator for full-res */}
            {loadingFullRes && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-lg px-4 py-2 flex items-center gap-2 text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading full resolution...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-lg px-4 py-2">
            {/* Zoom controls */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.max(z - 0.25, 0.5));
              }}
              className="text-white/70 hover:text-white p-1"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>

            <span className="text-white/70 text-sm min-w-[4rem] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.min(z + 0.25, 3));
              }}
              className="text-white/70 hover:text-white p-1"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            <div className="w-px h-5 bg-white/20 mx-2" />

            {/* Download button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadImage();
              }}
              className="text-white/70 hover:text-white p-1"
              aria-label="Download"
            >
              <Download className="h-5 w-5" />
            </button>

            <div className="w-px h-5 bg-white/20 mx-2" />

            {/* Image counter */}
            <span className="text-white/70 text-sm">
              {selectedIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default PhotoGallery;
