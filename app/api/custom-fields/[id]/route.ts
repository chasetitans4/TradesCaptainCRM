// =====================================================
// CUSTOM FIELD DEFINITION API
// PATCH /api/custom-fields/[id] - Update field definition
// DELETE /api/custom-fields/[id] - Delete field definition
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { updateFieldDefinition, deleteFieldDefinition, reorderFieldDefinitions } from '@/lib/custom-fields';
import { apiLogger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/owner can modify field definitions
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle reorder action
    if (body.action === 'reorder') {
      const { entityType, fieldIds } = body;
      if (!entityType || !fieldIds) {
        return NextResponse.json(
          { error: 'entityType and fieldIds are required for reorder' },
          { status: 400 }
        );
      }
      await reorderFieldDefinitions(profile.business_id, entityType, fieldIds);
      return NextResponse.json({ success: true });
    }

    const definition = await updateFieldDefinition(id, {
      fieldLabel: body.fieldLabel,
      options: body.options,
      defaultValue: body.defaultValue,
      isRequired: body.isRequired,
      isActive: body.isActive,
      placeholder: body.placeholder,
      helpText: body.helpText,
      validationRegex: body.validationRegex,
      minValue: body.minValue,
      maxValue: body.maxValue,
    });

    return NextResponse.json(definition);
  } catch (error) {
    apiLogger.error({ msg: 'Error updating custom field', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update custom field' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/owner can delete field definitions
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    await deleteFieldDefinition(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ msg: 'Error deleting custom field', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete custom field' },
      { status: 500 }
    );
  }
}
