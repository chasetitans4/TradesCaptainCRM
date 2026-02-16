'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import { Camera, X, Plus, SkipForward } from 'lucide-react';

type PhotoPhase = 'before' | 'after';

interface BeforeAfterPhotosProps {
  jobId: string;
  businessId: string;
  userId: string;
  phase: PhotoPhase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (photosTaken: number) => void;
  onSkip: () => void;
}

interface CapturedPhoto {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
}

export function BeforeAfterPhotos({
  jobId,
  businessId,
  userId,
  phase,
  open,
  onOpenChange,
  onComplete,
  onSkip,
}: BeforeAfterPhotosProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const preview = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { file, preview, uploading: false, uploaded: false }]);
    });

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    if (photos.length === 0) {
      onSkip();
      return;
    }

    setSaving(true);
    const supabase = createClient();
    let uploadedCount = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.uploaded) {
        uploadedCount++;
        continue;
      }

      setPhotos(prev =>
        prev.map((p, idx) => idx === i ? { ...p, uploading: true } : p)
      );

      const ext = photo.file.name.split('.').pop() || 'jpg';
      const storagePath = `job-photos/${businessId}/${jobId}/${phase}-${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(storagePath, photo.file, { contentType: photo.file.type });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('job-photos')
          .getPublicUrl(storagePath);

        await supabase.from('job_photos').insert({
          job_id: jobId,
          business_id: businessId,
          uploaded_by: userId,
          photo_url: urlData.publicUrl,
          storage_path: storagePath,
          photo_type: phase,
          caption: `${phase === 'before' ? 'Before' : 'After'} photo`,
          taken_at: new Date().toISOString(),
        });

        uploadedCount++;
        setPhotos(prev =>
          prev.map((p, idx) => idx === i ? { ...p, uploading: false, uploaded: true } : p)
        );
      } else {
        setPhotos(prev =>
          prev.map((p, idx) => idx === i ? { ...p, uploading: false } : p)
        );
      }
    }

    setSaving(false);
    onComplete(uploadedCount);
  };

  const handleClose = () => {
    // Clean up previews
    photos.forEach(p => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
      title={`${phase === 'before' ? 'Before' : 'After'} Photos`}
      description={`Take ${phase} photos of the job site (optional)`}
    >
      <div className="space-y-4 p-1">
        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={photo.preview}
                  alt={`${phase} photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {photo.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {photo.uploaded && (
                  <div className="absolute top-1 right-1 bg-success rounded-full p-0.5">
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                )}
                {!photo.uploading && !photo.uploaded && (
                  <button
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                    onClick={() => removePhoto(i)}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Capture button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleCapture}
          className="hidden"
        />

        <Button
          variant="outline"
          className="w-full h-20 border-dashed border-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
        >
          <div className="flex flex-col items-center gap-1">
            {photos.length > 0 ? (
              <>
                <Plus className="h-6 w-6" />
                <span className="text-xs">Add more</span>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8" />
                <span className="text-sm">Take {phase} photo</span>
              </>
            )}
          </div>
        </Button>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onSkip}
            disabled={saving}
          >
            <SkipForward className="h-4 w-4 mr-1.5" />
            Skip
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Uploading...' : photos.length > 0 ? `Save ${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'Continue'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
