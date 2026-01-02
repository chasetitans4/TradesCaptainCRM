'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

type PhotoType = 'before' | 'during' | 'after' | 'issue' | 'general';

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: PhotoType;
  caption?: string;
  created_at: string;
}

interface GroupedPhotos {
  before: JobPhoto[];
  during: JobPhoto[];
  after: JobPhoto[];
  issue: JobPhoto[];
  general: JobPhoto[];
}

interface JobPhotosProps {
  jobId: string;
  initialPhotos?: GroupedPhotos;
  readOnly?: boolean;
}

export function JobPhotos({ jobId, initialPhotos, readOnly = false }: JobPhotosProps) {
  const [photos, setPhotos] = useState<GroupedPhotos>(
    initialPhotos || { before: [], during: [], after: [], issue: [], general: [] }
  );
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>('before');
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobId', jobId);
      formData.append('photoType', photoType);
      if (caption) formData.append('caption', caption);

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();

      // Refresh photos
      await loadPhotos();

      toast({ title: 'Photo uploaded successfully' });
      setCaption('');
    } catch (error) {
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await fetch(`/api/photos?jobId=${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');

      await loadPhotos();
      setSelectedPhoto(null);
      toast({ title: 'Photo deleted' });
    } catch (error) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const photoTypeLabels: Record<PhotoType, string> = {
    before: 'Before',
    during: 'During',
    after: 'After',
    issue: 'Issues',
    general: 'General',
  };

  const totalPhotos = Object.values(photos).flat().length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Job Photos ({totalPhotos})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!readOnly && (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <Select value={photoType} onValueChange={(v) => setPhotoType(v as PhotoType)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(photoTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        <Tabs defaultValue="before">
          <TabsList className="grid w-full grid-cols-5">
            {Object.entries(photoTypeLabels).map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label} ({photos[value as PhotoType]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(photos).map(([type, photoList]) => (
            <TabsContent key={type} value={type}>
              {photoList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No {photoTypeLabels[type as PhotoType].toLowerCase()} photos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photoList.map((photo: JobPhoto) => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || 'Job photo'}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {photo.caption && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Photo Preview Dialog */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedPhoto?.caption || 'Photo'}
              </DialogTitle>
            </DialogHeader>
            {selectedPhoto && (
              <div className="space-y-4">
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.caption || 'Job photo'}
                  className="w-full rounded-lg"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedPhoto.created_at).toLocaleString()}
                  </span>
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedPhoto.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
