'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Upload,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  MoreVertical,
  Copy,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays } from 'date-fns';

type DocumentType =
  | 'contract'
  | 'permit'
  | 'license'
  | 'insurance'
  | 'warranty'
  | 'invoice'
  | 'quote'
  | 'photo'
  | 'manual'
  | 'other';

interface Document {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  description?: string;
  tags?: string[];
  expiration_date?: string;
  created_at: string;
}

interface DocumentListProps {
  entityType: 'customer' | 'job' | 'equipment' | 'business' | 'business_inventory';
  entityId: string;
  initialDocuments?: Document[];
  readOnly?: boolean;
}

const documentTypeLabels: Record<DocumentType, string> = {
  contract: 'Contract',
  permit: 'Permit',
  license: 'License',
  insurance: 'Insurance',
  warranty: 'Warranty',
  invoice: 'Invoice',
  quote: 'Quote',
  photo: 'Photo',
  manual: 'Manual',
  other: 'Other',
};

const documentTypeColors: Record<DocumentType, string> = {
  contract: 'bg-blue-100 text-blue-800',
  permit: 'bg-orange-100 text-orange-800',
  license: 'bg-green-100 text-green-800',
  insurance: 'bg-purple-100 text-purple-800',
  warranty: 'bg-cyan-100 text-cyan-800',
  invoice: 'bg-yellow-100 text-yellow-800',
  quote: 'bg-indigo-100 text-indigo-800',
  photo: 'bg-pink-100 text-pink-800',
  manual: 'bg-gray-100 text-gray-800',
  other: 'bg-gray-100 text-gray-800',
};

export function DocumentList({
  entityType,
  entityId,
  initialDocuments = [],
  readOnly = false,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    documentType: 'other' as DocumentType,
    name: '',
    description: '',
    expirationDate: '',
    tags: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) return;

    const fetchDocuments = async () => {
      try {
        const res = await fetch(`/api/documents?entityType=${entityType}&entityId=${entityId}`);
        if (res.ok) {
          const data = await res.json();
          setDocuments(data);
        }
      } catch (error) {
        console.error('Failed to fetch documents', error);
      }
    };

    if (entityId && entityType) {
      fetchDocuments();
    }
  }, [entityType, entityId, initialDocuments]);

  const handleUpload = async () => {
    if (!uploadData.file) {
      toast({ title: 'Please select a file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('documentType', uploadData.documentType);
      if (uploadData.name) formData.append('name', uploadData.name);
      if (uploadData.description) formData.append('description', uploadData.description);
      if (uploadData.expirationDate) formData.append('expirationDate', uploadData.expirationDate);
      if (uploadData.tags) formData.append('tags', JSON.stringify(uploadData.tags.split(',').map(t => t.trim())));

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const newDoc = await response.json();
      setDocuments([newDoc, ...documents]);
      setShowUploadDialog(false);
      setUploadData({
        file: null,
        documentType: 'other',
        name: '',
        description: '',
        expirationDate: '',
        tags: '',
      });
      toast({ title: 'Document uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');

      setDocuments(documents.filter(d => d.id !== documentId));
      toast({ title: 'Document deleted' });
    } catch (error) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return null;

    const daysUntil = differenceInDays(new Date(expirationDate), new Date());

    if (daysUntil < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (daysUntil <= 30) return { label: `Expires in ${daysUntil} days`, variant: 'warning' as const };
    return null;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({documents.length})
          </CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredDocuments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match your search'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => {
              const expirationStatus = getExpirationStatus(doc.expiration_date);

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{doc.name}</p>
                        <Badge className={documentTypeColors[doc.document_type]}>
                          {documentTypeLabels[doc.document_type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                        {expirationStatus && (
                          <Badge variant={expirationStatus.variant === 'warning' ? 'outline' : expirationStatus.variant}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {expirationStatus.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    {!readOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>File *</Label>
                <Input
                  type="file"
                  onChange={(e) => setUploadData({
                    ...uploadData,
                    file: e.target.files?.[0] || null,
                    name: uploadData.name || e.target.files?.[0]?.name || '',
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Type *</Label>
                  <Select
                    value={uploadData.documentType}
                    onValueChange={(v) => setUploadData({ ...uploadData, documentType: v as DocumentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={uploadData.expirationDate}
                    onChange={(e) => setUploadData({ ...uploadData, expirationDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={uploadData.name}
                  onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  placeholder="Document name"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={uploadData.tags}
                  onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                  placeholder="Comma-separated tags"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !uploadData.file}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
