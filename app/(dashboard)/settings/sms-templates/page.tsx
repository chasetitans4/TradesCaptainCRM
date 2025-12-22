'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  MessageSquare,
  Loader2,
  Save,
  X,
  Copy,
  Check,
  FileText,
  Calendar,
  Receipt,
  UserCheck,
  Tag,
} from 'lucide-react';
import type { SMSTemplate } from '@/types';

type TemplateCategory = 'appointment' | 'follow_up' | 'quote' | 'invoice' | 'general';

const CATEGORIES: { value: TemplateCategory; label: string; icon: React.ElementType }[] = [
  { value: 'appointment', label: 'Appointment', icon: Calendar },
  { value: 'follow_up', label: 'Follow Up', icon: UserCheck },
  { value: 'quote', label: 'Quote', icon: FileText },
  { value: 'invoice', label: 'Invoice', icon: Receipt },
  { value: 'general', label: 'General', icon: Tag },
];

const TEMPLATE_VARIABLES = [
  { key: '{{customer_name}}', description: 'Customer\'s name' },
  { key: '{{business_name}}', description: 'Your business name' },
  { key: '{{job_date}}', description: 'Scheduled job date' },
  { key: '{{job_time}}', description: 'Scheduled job time' },
  { key: '{{service}}', description: 'Service type' },
  { key: '{{business_phone}}', description: 'Your business phone' },
  { key: '{{quote_amount}}', description: 'Quote total amount' },
  { key: '{{invoice_amount}}', description: 'Invoice total amount' },
];

export default function SMSTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<TemplateCategory>('general');
  const [formIsDefault, setFormIsDefault] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/sms/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormContent('');
    setFormCategory('general');
    setFormIsDefault(false);
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const startEditing = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormContent(template.content);
    setFormCategory((template.category as TemplateCategory) || 'general');
    setFormIsDefault(template.is_default || false);
    setIsCreating(false);
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) return;

    setSaving(true);
    try {
      const url = editingTemplate
        ? `/api/sms/templates/${editingTemplate.id}`
        : '/api/sms/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          content: formContent.trim(),
          category: formCategory,
          is_default: formIsDefault,
        }),
      });

      if (response.ok) {
        await loadTemplates();
        resetForm();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/sms/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
        if (editingTemplate?.id === id) {
          resetForm();
        }
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertVariable = (variable: string) => {
    setFormContent((prev) => prev + variable);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || Tag;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">SMS Templates</h1>
            <p className="text-xs text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={startCreating}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">New</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Create/Edit Form */}
        {(isCreating || editingTemplate) && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Appointment Reminder"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setFormCategory(cat.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        formCategory === cat.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-muted-foreground">Message</label>
                <span className="text-xs text-muted-foreground">
                  {formContent.length} chars
                  {formContent.length > 160 && (
                    <span className="text-amber-500 ml-1">
                      ({Math.ceil(formContent.length / 160)} SMS segments)
                    </span>
                  )}
                </span>
              </div>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Enter your message template..."
                className="w-full h-32 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Variables */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">
                Insert Variable
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                    className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    title={v.description}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">Set as Default</p>
                <p className="text-xs text-muted-foreground">
                  Use this template by default in this category
                </p>
              </div>
              <button
                onClick={() => setFormIsDefault(!formIsDefault)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  formIsDefault ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    formIsDefault ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !formName.trim() || !formContent.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        )}

        {/* Templates List */}
        {templates.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create message templates to save time when sending SMS
            </p>
            <button
              onClick={startCreating}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {CATEGORIES.map((category) => {
              const categoryTemplates = templates.filter(
                (t) => t.category === category.value
              );
              if (categoryTemplates.length === 0) return null;

              const Icon = category.icon;

              return (
                <div key={category.value}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {category.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {categoryTemplates.map((template) => {
                      const CategoryIcon = getCategoryIcon(template.category || 'general');

                      return (
                        <div
                          key={template.id}
                          className={`bg-card rounded-xl border p-4 ${
                            editingTemplate?.id === template.id
                              ? 'border-primary'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{template.name}</h3>
                                {template.is_default && (
                                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {template.content}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopy(template.content, template.id)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                                title="Copy template"
                              >
                                {copiedId === template.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                              <button
                                onClick={() => startEditing(template)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                                title="Edit template"
                              >
                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleDelete(template.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete template"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized templates */}
            {templates.filter((t) => !t.category || !CATEGORIES.find((c) => c.value === t.category)).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Uncategorized
                  </span>
                </div>
                <div className="space-y-2">
                  {templates
                    .filter((t) => !t.category || !CATEGORIES.find((c) => c.value === t.category))
                    .map((template) => (
                      <div
                        key={template.id}
                        className={`bg-card rounded-xl border p-4 ${
                          editingTemplate?.id === template.id
                            ? 'border-primary'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{template.name}</h3>
                              {template.is_default && (
                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {template.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(template.content, template.id)}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                              title="Copy template"
                            >
                              {copiedId === template.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => startEditing(template)}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                              title="Edit template"
                            >
                              <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete template"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
