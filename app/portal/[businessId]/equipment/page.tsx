'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
}

export default function EquipmentPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEquipment() {
      try {
        const response = await fetch(
          `/api/portal/equipment?businessId=${businessId}`
        );
        const data = await response.json();
        setEquipment(data || []);
      } catch (error) {
        console.error('Error loading equipment:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEquipment();
  }, [businessId]);

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

      {equipment.length === 0 ? (
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
          {equipment.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Wrench className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.equipment_type}</p>
                    </div>
                  </div>
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
