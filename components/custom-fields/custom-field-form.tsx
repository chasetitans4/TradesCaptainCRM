'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

type CustomFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'email'
  | 'phone'
  | 'currency'
  | 'textarea';

interface CustomFieldDefinition {
  id: string;
  field_name: string;
  field_label: string;
  field_type: CustomFieldType;
  options?: string[];
  default_value?: any;
  is_required: boolean;
  placeholder?: string;
  help_text?: string;
  min_value?: number;
  max_value?: number;
  value: any;
}

interface CustomFieldFormProps {
  fields: CustomFieldDefinition[];
  onChange: (fieldName: string, value: any) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
}

export function CustomFieldForm({
  fields,
  onChange,
  errors = {},
  readOnly = false,
}: CustomFieldFormProps) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={field.value}
          onChange={(value) => onChange(field.field_name, value)}
          error={errors[field.field_name]}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

interface CustomFieldInputProps {
  field: CustomFieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  readOnly?: boolean;
}

function CustomFieldInput({ field, value, onChange, error, readOnly }: CustomFieldInputProps) {
  const [multiselectValue, setMultiselectValue] = useState<string[]>(
    Array.isArray(value) ? value : []
  );

  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <Input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
          />
        );

      case 'number':
      case 'currency':
        return (
          <div className="relative">
            {field.field_type === 'currency' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
            )}
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder={field.placeholder}
              min={field.min_value}
              max={field.max_value}
              className={field.field_type === 'currency' ? 'pl-7' : ''}
              disabled={readOnly}
            />
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.field_name}
              checked={!!value}
              onCheckedChange={onChange}
              disabled={readOnly}
            />
            <label
              htmlFor={field.field_name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.help_text || 'Yes'}
            </label>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            <Select
              value=""
              onValueChange={(newValue) => {
                if (!multiselectValue.includes(newValue)) {
                  const updated = [...multiselectValue, newValue];
                  setMultiselectValue(updated);
                  onChange(updated);
                }
              }}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select options'} />
              </SelectTrigger>
              <SelectContent>
                {field.options
                  ?.filter((opt) => !multiselectValue.includes(opt))
                  .map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {multiselectValue.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {multiselectValue.map((item) => (
                  <Badge key={item} variant="secondary" className="pr-1">
                    {item}
                    {!readOnly && (
                      <button
                        onClick={() => {
                          const updated = multiselectValue.filter((v) => v !== item);
                          setMultiselectValue(updated);
                          onChange(updated);
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_name}>
        {field.field_label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
      {field.help_text && field.field_type !== 'boolean' && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
