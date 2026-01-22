'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Wrench, Clock, Shield, Plus, ChevronDown, ChevronUp, History, CheckCircle, Camera, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { useDemoMode, getDemoEquipment, mergeWithDemoData } from '@/lib/portal/demo-data/use-demo-data';
const portalEquipmentLogger = logger.child({ context: 'portal.equipment' });

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  description: string;
  technician?: string;
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

export default function EquipmentPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
  const demoMode = useDemoMode();

  useEffect(() => {
    async function loadEquipment() {
      try {
        const response = await fetch(
          `/api/portal/equipment?businessId=${businessId}`
        );
        if (!response.ok) {
          throw new Error('Failed to load equipment');
        }
        const data = await response.json();
        setEquipment(data || []);
      } catch (error) {
        portalEquipmentLogger.error({
          msg: 'Error loading equipment',
          businessId,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
        });
      } finally {
        setLoading(false);
      }
    }

    loadEquipment();
  }, [businessId]);

  // Convert demo equipment to match page format and merge with real data
  const demoEquipment = getDemoEquipment().map((eq) => ({
    id: eq.id,
    equipment_type: eq.type,
    name: eq.name,
    brand: eq.brand,
    model: eq.model,
    serial_number: eq.serial_number,
    install_date: eq.install_date,
    warranty_expires: eq.warranty_expiry,
    next_service_due: eq.next_service_date,
    notes: eq.notes,
    status: eq.condition === 'needs_attention' || eq.condition === 'critical' ? 'needs_attention' : 'active',
    condition: eq.condition,
    location_in_property: eq.location,
    service_history: eq.service_history.map((svc) => ({
      id: svc.id,
      date: svc.date,
      type: svc.service_type,
      description: svc.description,
      technician: svc.technician,
    })),
  })) as Equipment[];
  const displayEquipment = mergeWithDemoData(equipment, demoEquipment, demoMode);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isWarrantyExpiring = (date?: string) => {
    if (!date) return false;
    const warrantyDate = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return warrantyDate <= thirtyDaysFromNow && warrantyDate >= new Date();
  };

  const isWarrantyExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isServiceDue = (date?: string) => {
    if (!date) return false;
    return new Date(date) <= new Date();
  };

  if (loading) {
    return <EquipmentSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Equipment</h1>
          <p className="text-gray-500">View and manage your equipment</p>
        </div>
      </div>

      {displayEquipment.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No equipment registered
            </h3>
            <p className="text-gray-500 mb-4">
              Your equipment and service history will appear here once registered
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayEquipment.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="pt-6">
                {/* Photo Thumbnails */}
                {item.photo_urls && item.photo_urls.length > 0 ? (
                  <Link href={`/portal/${businessId}/equipment/${item.id}`} className="block mb-4">
                    <div className="flex gap-2 overflow-hidden">
                      {item.photo_urls.slice(0, 3).map((url, idx) => (
                        <div
                          key={url}
                          className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
                        >
                          <Image
                            src={url}
                            alt={`${item.name} photo ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {item.photo_urls.length > 3 && (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm flex-shrink-0">
                          +{item.photo_urls.length - 3}
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <Link
                    href={`/portal/${businessId}/equipment/${item.id}`}
                    className="block mb-4 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors text-center"
                  >
                    <Camera className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                    <span className="text-sm text-gray-500">Add photos</span>
                  </Link>
                )}

                <div className="flex items-start justify-between mb-4">
                  <Link href={`/portal/${businessId}/equipment/${item.id}`} className="flex items-center gap-3 hover:opacity-80">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Wrench className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.equipment_type}</p>
                    </div>
                  </Link>
                  <Badge
                    className={
                      item.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {item.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {item.brand && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Brand</span>
                      <span className="font-medium">{item.brand}</span>
                    </div>
                  )}
                  {item.model && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Model</span>
                      <span className="font-medium">{item.model}</span>
                    </div>
                  )}
                  {item.serial_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Serial #</span>
                      <span className="font-medium font-mono text-xs">
                        {item.serial_number}
                      </span>
                    </div>
                  )}
                  {item.install_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Installed</span>
                      <span className="font-medium">{formatDate(item.install_date)}</span>
                    </div>
                  )}
                </div>

                {/* Warranty Status */}
                {item.warranty_expires && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                      isWarrantyExpired(item.warranty_expires)
                        ? 'bg-red-50 text-red-800'
                        : isWarrantyExpiring(item.warranty_expires)
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-green-50 text-green-800'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">
                      {isWarrantyExpired(item.warranty_expires)
                        ? 'Warranty expired'
                        : isWarrantyExpiring(item.warranty_expires)
                        ? 'Warranty expiring soon'
                        : 'Under warranty'}{' '}
                      - {formatDate(item.warranty_expires)}
                    </span>
                  </div>
                )}

                {/* Service Status */}
                {item.next_service_due && (
                  <div
                    className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                      isServiceDue(item.next_service_due)
                        ? 'bg-orange-50 text-orange-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {isServiceDue(item.next_service_due)
                        ? 'Service due'
                        : 'Next service'}{' '}
                      - {formatDate(item.next_service_due)}
                    </span>
                  </div>
                )}

                {/* Request Service Button */}
                {(isServiceDue(item.next_service_due) ||
                  isWarrantyExpiring(item.warranty_expires)) && (
                  <Link
                    href={`/portal/${businessId}/request?equipment=${item.id}`}
                    className="block mt-4"
                  >
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Request Service
                    </Button>
                  </Link>
                )}

                {/* Service History Toggle */}
                {item.service_history && item.service_history.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <button
                      onClick={() => setExpandedEquipment(
                        expandedEquipment === item.id ? null : item.id
                      )}
                      className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      <span className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Service History ({item.service_history.length})
                      </span>
                      {expandedEquipment === item.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {expandedEquipment === item.id && (
                      <div className="mt-3 space-y-2">
                        {item.service_history.map((service) => (
                          <div
                            key={service.id}
                            className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{service.type}</span>
                                <span className="text-gray-500 text-xs">
                                  {formatDate(service.date)}
                                </span>
                              </div>
                              <p className="text-gray-600 text-xs mt-0.5">
                                {service.description}
                              </p>
                              {service.technician && (
                                <p className="text-gray-400 text-xs">
                                  Tech: {service.technician}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* View Details Link */}
                <div className="mt-4 pt-4 border-t">
                  <Link href={`/portal/${businessId}/equipment/${item.id}`}>
                    <Button variant="outline" className="w-full gap-2">
                      View Details
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EquipmentSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-48 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
