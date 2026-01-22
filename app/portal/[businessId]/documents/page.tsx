'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  File as FileIcon,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';

const documentsLogger = logger.child({ context: 'portal.documents' });

interface Document {
  id: string;
  name: string;
  category: string;
  file_type: string;
  file_size: number;
  created_at: string;
  file_url: string;
}

export default function DocumentsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch(`/api/portal/documents?businessId=${businessId}`);
        if (!response.ok) {
          throw new Error('Failed to load documents');
        }
        const data = await response.json();
        setDocuments(data || []);
      } catch (err) {
        documentsLogger.error({
          msg: 'Error loading documents',
          error: err instanceof Error ? { message: err.message } : { message: String(err) },
        });
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [businessId]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const categories = Array.from(new Set(documents.map(d => d.category)));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500">Access your contracts, manuals, and reports</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500">
              {search || categoryFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Documents shared with you will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {doc.category}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-1 truncate" title={doc.name}>
                  {doc.name}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </div>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => window.open(doc.file_url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
