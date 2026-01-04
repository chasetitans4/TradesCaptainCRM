// =====================================================
// CUSTOM FIELDS API
// GET /api/custom-fields - Get field definitions
// POST /api/custom-fields - Create field definition
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  createFieldDefinition,
  getFieldDefinitions,
  getFieldsWithDefinitions,
  setFieldValues,
  validateEntityFields,
} from '@/lib/custom-fields';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as any;
    const entityId = searchParams.get('entityId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (!entityType) {
      return NextResponse.json(
        { error: 'entityType is required' },
        { status: 400 }
      );
    }

    // If entityId is provided, get fields with values
    if (entityId) {
      const fieldsWithValues = await getFieldsWithDefinitions(
        profile.business_id,
        entityType,
        entityId
      );
      return NextResponse.json(fieldsWithValues);
    }

    // Otherwise just get definitions
    const definitions = await getFieldDefinitions(
      profile.business_id,
      entityType,
      includeInactive
    );
    return NextResponse.json(definitions);
  } catch (error) {
    apiLogger.error({ msg: 'Error fetching custom fields', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch custom fields' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/owner can create field definitions
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();

    // Handle setting field values
    if (body.action === 'setValues') {
      const { entityType, entityId, values } = body;
      if (!entityType || !entityId || !values) {
        return NextResponse.json(
          { error: 'entityType, entityId, and values are required' },
          { status: 400 }
        );
      }

      // Validate values
      const validation = await validateEntityFields(profile.business_id, entityType, values);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }

      await setFieldValues(profile.business_id, entityType, entityId, values);
      return NextResponse.json({ success: true });
    }

    // Create field definition
    const {
      entityType,
      fieldName,
      fieldLabel,
      fieldType,
      options,
      defaultValue,
      isRequired,
      placeholder,
      helpText,
      validationRegex,
      minValue,
      maxValue,
    } = body;

    if (!entityType || !fieldName || !fieldLabel || !fieldType) {
      return NextResponse.json(
        { error: 'entityType, fieldName, fieldLabel, and fieldType are required' },
        { status: 400 }
      );
    }

    const definition = await createFieldDefinition({
      businessId: profile.business_id,
      entityType,
      fieldName,
      fieldLabel,
      fieldType,
      options,
      defaultValue,
      isRequired,
      placeholder,
      helpText,
      validationRegex,
      minValue,
      maxValue,
    });

    return NextResponse.json(definition);
  } catch (error) {
    apiLogger.error({ msg: 'Error with custom fields', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process custom fields request' },
      { status: 500 }
    );
  }
}
