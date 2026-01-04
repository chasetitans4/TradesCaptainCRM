'use client';

// =====================================================
// LEADS CAPTAIN v2 TEMPLATES PAGE
// Manage response templates with variable support
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  ArrowLeft,
  MoreVertical,
  FileText,
  Trash2,
  Edit,
  Copy,
  Lock,
  Eye,
  Variable,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LeadsCaptainTemplate, CreateTemplateRequest } from '@/types/leads-captain';
import { logger } from '@/lib/logger';

const TEMPLATE_VARIABLES = [
  { key: 'business_name', description: 'Your business name' },
  { key: 'owner_name', description: 'Owner/operator name' },
  { key: 'first_name', description: 'Customer first name' },
  { key: 'customer_name', description: 'Customer full name' },
  { key: 'main_phone', description: 'Main business phone' },
  { key: 'emergency_phone', description: 'Emergency phone' },
  { key: 'booking_link', description: 'Online booking URL' },
  { key: 'next_available', description: 'Next available time' },
  { key: 'service_area', description: 'Service area description' },
];

export default function LeadsCaptainTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<LeadsCaptainTemplate[]>([]);
  const [limits, setLimits] = useState<{ current: number; max: number; remaining: number } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LeadsCaptainTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: '',
    content: '',
  });
  const [preview, setPreview] = useState<string>('');
  const lcTemplatesLogger = logger.child({ context: 'leads-captain.templates' });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads-captain/v2/templates?include_inactive=true');
      const data = await res.json();
      setTemplates(data.templates || []);
      setLimits(data.limits);
    } catch (error) {
      lcTemplatesLogger.error({
        msg: 'Error fetching templates',
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setSelectedTemplate(null);
    setFormData({ name: '', content: '' });
    setPreview('');
    setEditDialogOpen(true);
  };

  const openEditDialog = (template: LeadsCaptainTemplate) => {
    setIsCreating(false);
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      template_key: template.template_key || undefined,
      max_length: template.max_length,
      emoji_setting: template.emoji_setting,
    });
    updatePreview(template.content);
    setEditDialogOpen(true);
  };

  const updatePreview = (content: string) => {
    // Simple preview with sample data
    let result = content;
    result = result.replace(/\{\{business_name\}\}/g, 'ABC Plumbing');
    result = result.replace(/\{\{owner_name\}\}/g, 'John Smith');
    result = result.replace(/\{\{first_name\}\}/g, 'Sarah');
    result = result.replace(/\{\{customer_name\}\}/g, 'Sarah Johnson');
    result = result.replace(/\{\{main_phone\}\}/g, '(555) 123-4567');
    result = result.replace(/\{\{emergency_phone\}\}/g, '(555) 987-6543');
    result = result.replace(/\{\{booking_link\}\}/g, 'https://book.example.com');
    result = result.replace(/\{\{next_available\}\}/g, 'tomorrow at 9AM');
    result = result.replace(/\{\{service_area\}\}/g, 'Austin metro area');
    // Handle conditionals simply
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, '$2');
    result = result.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, '');
    setPreview(result.trim());
  };

  const insertVariable = (key: string) => {
    const variable = `{{${key}}}`;
    setFormData((prev) => ({
      ...prev,
      content: prev.content + variable,
    }));
    updatePreview(formData.content + variable);
  };

  const saveTemplate = async () => {
    if (!formData.name || !formData.content) {
      toast.error('Name and content are required');
      return;
    }

    try {
      setSaving(true);

      if (isCreating) {
        const res = await fetch('/api/leads-captain/v2/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        toast.success('Template created');
      } else if (selectedTemplate) {
        const res = await fetch(`/api/leads-captain/v2/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        toast.success('Template updated');
      }

      setEditDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      lcTemplatesLogger.error({
        msg: 'Error saving template',
        error: error instanceof Error ? error.message : String(error),
        isCreating,
        templateId: selectedTemplate?.id,
      });
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const res = await fetch(`/api/leads-captain/v2/templates/${selectedTemplate.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Template deleted');
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      lcTemplatesLogger.error({
        msg: 'Error deleting template',
        error: error instanceof Error ? error.message : String(error),
        templateId: selectedTemplate.id,
      });
      toast.error(error instanceof Error ? error.message : 'Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads-captain')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Response Templates</h1>
            <p className="text-muted-foreground">
              Reusable message templates with dynamic variables
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {limits && (
            <span className="text-sm text-muted-foreground">
              {limits.current} / {limits.max} templates
            </span>
          )}
          <Button onClick={openCreateDialog} disabled={!!(limits && limits.remaining === 0)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        </div>
      </div>

      {/* System Templates */}
      <Card>
        <CardHeader>
          <CardTitle>System Templates</CardTitle>
          <CardDescription>
            Built-in templates for common scenarios. Content can be edited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {systemTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => openEditDialog(template)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      System
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.content}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Templates</CardTitle>
          <CardDescription>
            Your custom templates for specific use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No custom templates yet</p>
              <p className="text-sm">Create templates for your unique needs</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{template.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info('Duplicate coming soon!')}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p
                    className="text-sm text-muted-foreground line-clamp-2 cursor-pointer"
                    onClick={() => openEditDialog(template)}
                  >
                    {template.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create Template' : 'Edit Template'}
            </DialogTitle>
            <DialogDescription>
              Use {`{{variable}}`} syntax to insert dynamic content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome Message"
                disabled={selectedTemplate?.is_system}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Message Content</Label>
                <span className="text-xs text-muted-foreground">
                  {formData.content.length} / 320 characters
                </span>
              </div>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, content: e.target.value }));
                  updatePreview(e.target.value);
                }}
                placeholder="Hey {{first_name}}! Thanks for reaching out to {{business_name}}..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Insert Variable</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((v) => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(v.key)}
                    title={v.description}
                  >
                    <Variable className="mr-1 h-3 w-3" />
                    {v.key}
                  </Button>
                ))}
              </div>
            </div>

            {preview && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Label>
                <div className="p-3 rounded-lg bg-muted text-sm">
                  {preview}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteTemplate}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
