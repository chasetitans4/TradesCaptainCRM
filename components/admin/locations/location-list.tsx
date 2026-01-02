'use client';

// =====================================================
// LOCATION LIST COMPONENT
// Shows all locations for a client
// Version: 5.8
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Star,
} from 'lucide-react';

interface ClientLocation {
  id: string;
  client_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
}

interface LocationListProps {
  locations: ClientLocation[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (location: ClientLocation) => void;
  onDelete: (id: string) => void;
}

export function LocationList({
  locations,
  loading,
  onAdd,
  onEdit,
  onDelete,
}: LocationListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locations ({locations.length})
          </CardTitle>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No locations added</p>
            <Button variant="outline" className="mt-4" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Location
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`p-4 border rounded-lg ${
                  location.is_primary ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{location.name}</h3>
                      {location.is_primary && (
                        <Badge className="bg-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{location.address}</p>
                      <p>
                        {location.city}, {location.state} {location.zip}
                      </p>
                      {location.phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {location.phone}
                        </p>
                      )}
                      {location.email && (
                        <p className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {location.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(location)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {!location.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(location.id)}
                        disabled={deleting === location.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
