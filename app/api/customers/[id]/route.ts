// =====================================================
// SINGLE CUSTOMER API ROUTES
// GET /api/customers/[id] - Get a single customer
// PATCH /api/customers/[id] - Update a customer
// DELETE /api/customers/[id] - Delete a customer (hard delete)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import { apiLogger } from '@/lib/logger';

const customerLogger = apiLogger.child({ context: 'api.customers' });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Determine business ID
    let businessId = session.user.businessId;
    const queryBusinessId = searchParams.get('businessId');
    
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const supabase = await createClient();

    // Get customer (include soft-deleted for viewing in trash)
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    customerLogger.error({ error, context: 'Error in GET /api/customers/[id]' });
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Determine business ID
    let businessId = session.user.businessId;
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && body.businessId) {
      businessId = body.businessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const supabase = await createClient();

    // Verify customer belongs to business
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Update customer
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(customer);
  } catch (error) {
    customerLogger.error({ error, context: 'Error in PATCH /api/customers/[id]' });
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Determine business ID
    let businessId = session.user.businessId;
    const queryBusinessId = searchParams.get('businessId');
    
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    // Only owners and admins can delete customers
    if (session.user.role !== 'owner' && session.user.role !== 'admin' && session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Verify customer belongs to business
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Hard delete the customer
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      throw error;
    }

    customerLogger.info({
      msg: 'Customer deleted',
      customerId: id,
      customerName: existingCustomer.name,
      businessId: businessId,
      deletedBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Customer permanently deleted.',
    });
  } catch (error) {
    customerLogger.error({ error, context: 'Error in DELETE /api/customers/[id]' });
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
