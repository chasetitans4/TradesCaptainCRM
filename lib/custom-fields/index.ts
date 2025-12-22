// =====================================================
// CUSTOM FIELDS LIBRARY
// Business-defined custom fields for entities
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';

export type CustomFieldType =
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

export type CustomFieldEntityType = 'customer' | 'job' | 'quote' | 'invoice' | 'equipment';

export interface CustomFieldDefinition {
  id: string;
  business_id: string;
  entity_type: CustomFieldEntityType;
  field_name: string;
  field_label: string;
  field_type: CustomFieldType;
  options?: string[]; // For select/multiselect
  default_value?: any;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  placeholder?: string;
  help_text?: string;
  validation_regex?: string;
  min_value?: number;
  max_value?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  business_id: string;
  field_definition_id: string;
  entity_type: CustomFieldEntityType;
  entity_id: string;
  value: any;
  created_at: string;
  updated_at: string;
}

interface CreateFieldDefinitionParams {
  businessId: string;
  entityType: CustomFieldEntityType;
  fieldName: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
  options?: string[];
  defaultValue?: any;
  isRequired?: boolean;
  placeholder?: string;
  helpText?: string;
  validationRegex?: string;
  minValue?: number;
  maxValue?: number;
}

/**
 * Create a custom field definition
 */
export async function createFieldDefinition(
  params: CreateFieldDefinitionParams
): Promise<CustomFieldDefinition> {
  const supabase = await createServerClient();

  // Get max display order
  const { data: existing } = await supabase
    .from('custom_field_definitions')
    .select('display_order')
    .eq('business_id', params.businessId)
    .eq('entity_type', params.entityType)
    .order('display_order', { ascending: false })
    .limit(1);

  const displayOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({
      business_id: params.businessId,
      entity_type: params.entityType,
      field_name: params.fieldName,
      field_label: params.fieldLabel,
      field_type: params.fieldType,
      options: params.options,
      default_value: params.defaultValue,
      is_required: params.isRequired || false,
      is_active: true,
      display_order: displayOrder,
      placeholder: params.placeholder,
      help_text: params.helpText,
      validation_regex: params.validationRegex,
      min_value: params.minValue,
      max_value: params.maxValue,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get field definitions for an entity type
 */
export async function getFieldDefinitions(
  businessId: string,
  entityType: CustomFieldEntityType,
  includeInactive: boolean = false
): Promise<CustomFieldDefinition[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('business_id', businessId)
    .eq('entity_type', entityType)
    .order('display_order', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Update a field definition
 */
export async function updateFieldDefinition(
  fieldId: string,
  updates: Partial<{
    fieldLabel: string;
    options: string[];
    defaultValue: any;
    isRequired: boolean;
    isActive: boolean;
    placeholder: string;
    helpText: string;
    validationRegex: string;
    minValue: number;
    maxValue: number;
  }>
): Promise<CustomFieldDefinition> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .update({
      field_label: updates.fieldLabel,
      options: updates.options,
      default_value: updates.defaultValue,
      is_required: updates.isRequired,
      is_active: updates.isActive,
      placeholder: updates.placeholder,
      help_text: updates.helpText,
      validation_regex: updates.validationRegex,
      min_value: updates.minValue,
      max_value: updates.maxValue,
    })
    .eq('id', fieldId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a field definition (soft delete by deactivating)
 */
export async function deleteFieldDefinition(fieldId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('custom_field_definitions')
    .update({ is_active: false })
    .eq('id', fieldId);

  if (error) throw error;
}

/**
 * Reorder field definitions
 */
export async function reorderFieldDefinitions(
  businessId: string,
  entityType: CustomFieldEntityType,
  fieldIds: string[]
): Promise<void> {
  const supabase = await createServerClient();

  for (let i = 0; i < fieldIds.length; i++) {
    const { error } = await supabase
      .from('custom_field_definitions')
      .update({ display_order: i })
      .eq('id', fieldIds[i])
      .eq('business_id', businessId)
      .eq('entity_type', entityType);

    if (error) throw error;
  }
}

/**
 * Set custom field value
 */
export async function setFieldValue(
  businessId: string,
  fieldDefinitionId: string,
  entityType: CustomFieldEntityType,
  entityId: string,
  value: any
): Promise<CustomFieldValue> {
  const supabase = await createServerClient();

  // Upsert the value
  const { data, error } = await supabase
    .from('custom_field_values')
    .upsert(
      {
        business_id: businessId,
        field_definition_id: fieldDefinitionId,
        entity_type: entityType,
        entity_id: entityId,
        value,
      },
      {
        onConflict: 'field_definition_id,entity_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Set multiple custom field values at once
 */
export async function setFieldValues(
  businessId: string,
  entityType: CustomFieldEntityType,
  entityId: string,
  values: Record<string, any>
): Promise<void> {
  const supabase = await createServerClient();

  // Get field definitions to map field names to IDs
  const definitions = await getFieldDefinitions(businessId, entityType);
  const fieldMap = new Map(definitions.map(d => [d.field_name, d.id]));

  const upsertData = Object.entries(values)
    .filter(([fieldName]) => fieldMap.has(fieldName))
    .map(([fieldName, value]) => ({
      business_id: businessId,
      field_definition_id: fieldMap.get(fieldName)!,
      entity_type: entityType,
      entity_id: entityId,
      value,
    }));

  if (upsertData.length === 0) return;

  const { error } = await supabase
    .from('custom_field_values')
    .upsert(upsertData, {
      onConflict: 'field_definition_id,entity_id',
    });

  if (error) throw error;
}

/**
 * Get custom field values for an entity
 */
export async function getFieldValues(
  entityType: CustomFieldEntityType,
  entityId: string
): Promise<Record<string, any>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('custom_field_values')
    .select(`
      value,
      field_definition:custom_field_definitions(field_name, is_active)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) throw error;

  const result: Record<string, any> = {};
  for (const item of data || []) {
    if (item.field_definition?.is_active) {
      result[item.field_definition.field_name] = item.value;
    }
  }

  return result;
}

/**
 * Get custom fields with definitions for an entity
 */
export async function getFieldsWithDefinitions(
  businessId: string,
  entityType: CustomFieldEntityType,
  entityId: string
): Promise<(CustomFieldDefinition & { value: any })[]> {
  const definitions = await getFieldDefinitions(businessId, entityType);
  const values = await getFieldValues(entityType, entityId);

  return definitions.map(def => ({
    ...def,
    value: values[def.field_name] ?? def.default_value ?? null,
  }));
}

/**
 * Validate a field value
 */
export function validateFieldValue(
  definition: CustomFieldDefinition,
  value: any
): { valid: boolean; error?: string } {
  // Required check
  if (definition.is_required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `${definition.field_label} is required` };
  }

  // Skip further validation if empty and not required
  if (value === null || value === undefined || value === '') {
    return { valid: true };
  }

  // Type-specific validation
  switch (definition.field_type) {
    case 'number':
    case 'currency':
      const numVal = Number(value);
      if (isNaN(numVal)) {
        return { valid: false, error: `${definition.field_label} must be a number` };
      }
      if (definition.min_value !== null && numVal < definition.min_value!) {
        return { valid: false, error: `${definition.field_label} must be at least ${definition.min_value}` };
      }
      if (definition.max_value !== null && numVal > definition.max_value!) {
        return { valid: false, error: `${definition.field_label} must be at most ${definition.max_value}` };
      }
      break;

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: `${definition.field_label} must be a valid email` };
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return { valid: false, error: `${definition.field_label} must be a valid URL` };
      }
      break;

    case 'phone':
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(value)) {
        return { valid: false, error: `${definition.field_label} must be a valid phone number` };
      }
      break;

    case 'select':
      if (definition.options && !definition.options.includes(value)) {
        return { valid: false, error: `${definition.field_label} must be one of: ${definition.options.join(', ')}` };
      }
      break;

    case 'multiselect':
      if (definition.options && Array.isArray(value)) {
        const invalidOptions = value.filter(v => !definition.options!.includes(v));
        if (invalidOptions.length > 0) {
          return { valid: false, error: `Invalid options for ${definition.field_label}: ${invalidOptions.join(', ')}` };
        }
      }
      break;

    case 'date':
      if (isNaN(Date.parse(value))) {
        return { valid: false, error: `${definition.field_label} must be a valid date` };
      }
      break;
  }

  // Custom regex validation
  if (definition.validation_regex) {
    const regex = new RegExp(definition.validation_regex);
    if (!regex.test(String(value))) {
      return { valid: false, error: `${definition.field_label} has an invalid format` };
    }
  }

  return { valid: true };
}

/**
 * Validate all field values for an entity
 */
export async function validateEntityFields(
  businessId: string,
  entityType: CustomFieldEntityType,
  values: Record<string, any>
): Promise<{ valid: boolean; errors: Record<string, string> }> {
  const definitions = await getFieldDefinitions(businessId, entityType);
  const errors: Record<string, string> = {};

  for (const def of definitions) {
    const result = validateFieldValue(def, values[def.field_name]);
    if (!result.valid && result.error) {
      errors[def.field_name] = result.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Get field type configuration
 */
export function getFieldTypeConfig(fieldType: CustomFieldType): {
  label: string;
  inputType: string;
  hasOptions: boolean;
  hasMinMax: boolean;
} {
  const configs: Record<CustomFieldType, { label: string; inputType: string; hasOptions: boolean; hasMinMax: boolean }> = {
    text: { label: 'Text', inputType: 'text', hasOptions: false, hasMinMax: false },
    number: { label: 'Number', inputType: 'number', hasOptions: false, hasMinMax: true },
    boolean: { label: 'Yes/No', inputType: 'checkbox', hasOptions: false, hasMinMax: false },
    date: { label: 'Date', inputType: 'date', hasOptions: false, hasMinMax: false },
    select: { label: 'Dropdown', inputType: 'select', hasOptions: true, hasMinMax: false },
    multiselect: { label: 'Multi-Select', inputType: 'multiselect', hasOptions: true, hasMinMax: false },
    url: { label: 'URL', inputType: 'url', hasOptions: false, hasMinMax: false },
    email: { label: 'Email', inputType: 'email', hasOptions: false, hasMinMax: false },
    phone: { label: 'Phone', inputType: 'tel', hasOptions: false, hasMinMax: false },
    currency: { label: 'Currency', inputType: 'number', hasOptions: false, hasMinMax: true },
    textarea: { label: 'Long Text', inputType: 'textarea', hasOptions: false, hasMinMax: false },
  };

  return configs[fieldType] || configs.text;
}

/**
 * Copy custom field definitions from one business to another (for templates)
 */
export async function copyFieldDefinitions(
  sourceBusinessId: string,
  targetBusinessId: string,
  entityType?: CustomFieldEntityType
): Promise<number> {
  const supabase = await createServerClient();

  let query = supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('business_id', sourceBusinessId)
    .eq('is_active', true);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data: sourceFields, error: fetchError } = await query;

  if (fetchError) throw fetchError;
  if (!sourceFields || sourceFields.length === 0) return 0;

  const newFields = sourceFields.map(field => ({
    business_id: targetBusinessId,
    entity_type: field.entity_type,
    field_name: field.field_name,
    field_label: field.field_label,
    field_type: field.field_type,
    options: field.options,
    default_value: field.default_value,
    is_required: field.is_required,
    is_active: true,
    display_order: field.display_order,
    placeholder: field.placeholder,
    help_text: field.help_text,
    validation_regex: field.validation_regex,
    min_value: field.min_value,
    max_value: field.max_value,
  }));

  const { error: insertError } = await supabase
    .from('custom_field_definitions')
    .insert(newFields);

  if (insertError) throw insertError;

  return newFields.length;
}
