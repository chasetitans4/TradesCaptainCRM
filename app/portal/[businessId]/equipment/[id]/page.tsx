'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Camera,
  Trash2,
  Plus,
  Calendar,
  Shield,
  Wrench,
  MapPin,
  Hash,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { DocumentList } from '@/components/documents/document-list';

const equipmentLogger = logger.child({ context: 'portal.equipment.detail' });

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  description: string;
  technician: string;
}

interface Equipment {
  id: string;
  equipment_type: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  install_date?: string;
  warranty_expires?: string;
  last_service_date?: string;
  next_service_due?: string;
  notes?: string;
  status: string;
  photo_urls?: string[];
  location_in_property?: string;
  condition?: string;
  service_history?: ServiceHistory[];
}

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const equipmentId = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadEquipment = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/portal/equipment?businessId=${businessId}`
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        const found = data.find((e: Equipment) => e.id === equipmentId);
        if (found) {
          setEquipment(found);
        } else {
          setError('Equipment not found');
        }
      } else {
        setError('Failed to load equipment');
      }
    } catch (err) {
      equipmentLogger.error({
        msg: 'Error loading equipment',
        error: err instanceof Error ? { message: err.message } : { message: String(err) },
      });
      setError('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }, [businessId, equipmentId]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/portal/equipment/${equipmentId}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      // Reload equipment to get updated photos
      await loadEquipment();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setDeleting(photoUrl);
    setError(null);

    try {
      const response = await fetch(
        `/api/portal/equipment/${equipmentId}/photos?photoUrl=${encodeURIComponent(photoUrl)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete photo');
      }

      // Reload equipment to get updated photos
      await loadEquipment();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'needs_repair':
        return <Badge className="bg-yellow-100 text-yellow-800">Needs Repair</Badge>;
      case 'replaced':
        return <Badge className="bg-gray-100 text-gray-800">Replaced</Badge>;
      case 'removed':
        return <Badge className="bg-red-100 text-red-800">Removed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
      case 'fair':
        return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
      default:
        return null;
    }
  };

  const getWarrantyStatus = () => {
    if (!equipment?.warranty_expires) return null;

    const expiryDate = new Date(equipment.warranty_expires);
    const today = new Date();
    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      return { status: 'expired', text: 'Warranty Expired', color: 'text-red-600' };
    } else if (daysRemaining <= 30) {
      return { status: 'expiring', text: `Expires in ${daysRemaining} days`, color: 'text-yellow-600' };
    } else if (daysRemaining <= 90) {
      return { status: 'warning', text: `Expires in ${daysRemaining} days`, color: 'text-orange-600' };
    } else {
      return { status: 'active', text: 'Under Warranty', color: 'text-green-600' };
    }
  };

  const getServiceStatus = () => {
    if (!equipment?.next_service_due) return null;

    const dueDate = new Date(equipment.next_service_due);
    const today = new Date();
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDue < 0) {
      return { status: 'overdue', text: 'Service Overdue', color: 'text-red-600' };
    } else if (daysUntilDue <= 14) {
      return { status: 'due_soon', text: `Due in ${daysUntilDue} days`, color: 'text-yellow-600' };
    } else if (daysUntilDue <= 30) {
      return { status: 'upcoming', text: `Due in ${daysUntilDue} days`, color: 'text-blue-600' };
    } else {
      return { status: 'ok', text: formatDate(equipment.next_service_due), color: 'text-gray-600' };
    }
  };

  if (loading) {
    return <EquipmentDetailSkeleton />;
  }

  if (error && !equipment) {
    return (
      <div className="space-y-6">
        <Link href={`/portal/${businessId}/equipment`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Equipment
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error</h3>
            <p className="text-gray-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!equipment) return null;

  const photos = equipment.photo_urls || [];
  const warrantyStatus = getWarrantyStatus();
  const serviceStatus = getServiceStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/portal/${businessId}/equipment`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {equipment.name || equipment.equipment_type}
          </h1>
          {equipment.brand && equipment.model && (
            <p className="text-gray-500">
              {equipment.brand} {equipment.model}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {getStatusBadge(equipment.status)}
          {equipment.condition && getConditionBadge(equipment.condition)}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos ({photos.length}/10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((url, index) => (
              <div
                key={url}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
              >
                <Image
                  src={url}
                  alt={`Equipment photo ${index + 1}`}
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setLightboxIndex(index)}
                    className="p-2 bg-white/90 rounded-full mr-2"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePhoto(url)}
                    disabled={deleting === url}
                    className="p-2 bg-red-500 text-white rounded-full"
                  >
                    {deleting === url ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {/* Upload Button */}
            {photos.length < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="sr-only"
                />
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-8 w-8 mb-2" />
                    <span className="text-sm">Add Photo</span>
                  </>
                )}
              </label>
            )}

            {/* Empty State */}
            {photos.length === 0 && !uploading && (
              <div className="col-span-full py-8 text-center text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No photos yet</p>
                <p className="text-sm">Upload photos of your equipment for service reference</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Equipment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Wrench className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{equipment.equipment_type}</p>
              </div>
            </div>

            {equipment.serial_number && (
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Serial Number</p>
                  <p className="font-medium font-mono">{equipment.serial_number}</p>
                </div>
              </div>
            )}

            {equipment.location_in_property && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{equipment.location_in_property}</p>
                </div>
              </div>
            )}

            {equipment.install_date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Install Date</p>
                  <p className="font-medium">{formatDate(equipment.install_date)}</p>
                </div>
              </div>
            )}

            {equipment.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700">{equipment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warranty & Service */}
        <Card>
          <CardHeader>
            <CardTitle>Warranty & Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warranty Status */}
            <div className="flex items-start gap-3">
              <Shield className={`h-5 w-5 mt-0.5 ${warrantyStatus?.status === 'active' ? 'text-green-500' : warrantyStatus?.status === 'expired' ? 'text-red-500' : 'text-yellow-500'}`} />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Warranty Status</p>
                {warrantyStatus ? (
                  <>
                    <p className={`font-medium ${warrantyStatus.color}`}>
                      {warrantyStatus.text}
                    </p>
                    <p className="text-sm text-gray-500">
                      Expires: {formatDate(equipment.warranty_expires!)}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">No warranty information</p>
                )}
              </div>
            </div>

            {/* Last Service */}
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Last Service</p>
                {equipment.last_service_date ? (
                  <p className="font-medium">{formatDate(equipment.last_service_date)}</p>
                ) : (
                  <p className="text-gray-500">No service recorded</p>
                )}
              </div>
            </div>

            {/* Next Service */}
            <div className="flex items-start gap-3">
              <Clock className={`h-5 w-5 mt-0.5 ${serviceStatus?.status === 'overdue' ? 'text-red-500' : serviceStatus?.status === 'due_soon' ? 'text-yellow-500' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Next Service Due</p>
                {serviceStatus ? (
                  <p className={`font-medium ${serviceStatus.color}`}>
                    {serviceStatus.text}
                  </p>
                ) : (
                  <p className="text-gray-500">Not scheduled</p>
                )}
              </div>
            </div>

            {/* Request Service Button */}
            <div className="pt-4 border-t">
              <Link href={`/portal/${businessId}/request?equipmentId=${equipment.id}`}>
                <Button className="w-full">
                  <Wrench className="h-4 w-4 mr-2" />
                  Request Service
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Documents & Manuals</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList
            entityType="equipment"
            entityId={equipment.id}
            initialDocuments={[]}
          />
        </CardContent>
      </Card>

      {/* Service History */}
      {equipment.service_history && equipment.service_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Service History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equipment.service_history.map((service) => (
                <div
                  key={service.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{service.type}</h4>
                      <span className="text-sm text-gray-500">
                        {formatDate(service.date)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{service.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Technician: {service.technician}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Lightbox */}
      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        onNavigate(currentIndex + 1);
      }
    },
    [currentIndex, onClose, onNavigate, photos.length]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
      >
        <X className="h-8 w-8" />
      </button>

      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="absolute left-4 p-2 text-white/80 hover:text-white"
        >
          <ChevronLeft className="h-10 w-10" />
        </button>
      )}

      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="absolute right-4 p-2 text-white/80 hover:text-white"
        >
          <ChevronRight className="h-10 w-10" />
        </button>
      )}

      <div
        className="relative max-w-4xl max-h-[80vh] w-full h-full m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photos[currentIndex]}
          alt={`Equipment photo ${currentIndex + 1}`}
          fill
          className="object-contain"
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}

function EquipmentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="flex-1">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
