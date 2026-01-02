'use client';

// =====================================================
// DOCUMENT TEMPLATES COMPONENT
// Shows available document templates
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, ExternalLink } from 'lucide-react';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  file_url: string;
}

interface TemplateListProps {
  templates: DocumentTemplate[];
  loading: boolean;
  onDownload: (template: DocumentTemplate) => void;
}

export function TemplateList({
  templates,
  loading,
  onDownload,
}: TemplateListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      contract: 'bg-blue-100 text-blue-800',
      onboarding: 'bg-green-100 text-green-800',
      legal: 'bg-purple-100 text-purple-800',
      sales: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Group by category
  const grouped = templates.reduce((acc, template) => {
    const cat = template.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, DocumentTemplate[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No templates available
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, temps]) => (
              <div key={category}>
                <h3 className="font-medium mb-3">
                  <Badge
                    variant="outline"
                    className={getCategoryColor(category)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {temps.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownload(template)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
