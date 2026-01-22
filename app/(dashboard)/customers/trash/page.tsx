'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function CustomersTrashPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => router.push('/customers')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Customers
      </Button>
      
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-800">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Feature Temporarily Unavailable
          </CardTitle>
          <CardDescription className="text-yellow-700">
            The customer trash/restore functionality is currently being updated to match the new database schema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 mb-4">
            Soft-delete functionality is not currently supported for customers. Deleting a customer removes them permanently.
          </p>
          <Button onClick={() => router.push('/customers')}>
            Return to Customers List
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
