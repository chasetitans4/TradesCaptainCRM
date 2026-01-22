// =====================================================
// INVENTORY TRANSACTIONS API
// GET /api/inventory/[id]/transactions - Get transaction history
// POST /api/inventory/[id]/transactions - Record a new transaction
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, checkPermission } from '@/lib/permissions/check-permission';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export type TransactionType = 'check_in' | 'check_out' | 'adjustment' | 'transfer' | 'usage' | 'restock' | 'return' | 'damaged' | 'lost';

interface InventoryTransaction {
  id: string;
  inventory_id: string;
  type: TransactionType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  job_id?: string;
  notes?: string;
  performed_by: string;
  performed_at: string;
  created_at: string;
}

// GET - Get transaction history for an inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await checkPermission('manage_inventory');
    } catch (error) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: inventoryId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');

    const supabase = createAdminClient();

    // Verify the item belongs to the user's business
    const { data: item, error: itemError } = await supabase
      .from('business_inventory')
      .select('id, business_id')
      .eq('id', inventoryId)
      .eq('business_id', session.user.businessId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Build query for transactions
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        performed_by_user:users!inventory_transactions_performed_by_fkey (id, name),
        job:jobs (id, title)
      `, { count: 'exact' })
      .eq('inventory_id', inventoryId)
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      throw error;
    }

    // If no transactions table exists yet, return empty with job usage history
    if (!transactions || transactions.length === 0) {
      // Fallback to job_inventory_usage table
      const { data: usageHistory } = await supabase
        .from('job_inventory_usage')
        .select(`
          id,
          quantity_used,
          notes,
          created_at,
          job:jobs (id, title)
        `)
        .eq('inventory_id', inventoryId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const legacyTransactions = (usageHistory || []).map((usage) => ({
        id: usage.id,
        inventory_id: inventoryId,
        type: 'usage' as TransactionType,
        quantity: -usage.quantity_used,
        previous_quantity: 0,
        new_quantity: 0,
        job_id: (usage.job as any)?.id,
        job: usage.job,
        notes: usage.notes,
        performed_by: null,
        performed_at: usage.created_at,
        created_at: usage.created_at,
      }));

      return NextResponse.json({
        transactions: legacyTransactions,
        total: legacyTransactions.length,
        hasMore: false,
      });
    }

    return NextResponse.json({
      transactions,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'get inventory transactions' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get transactions' },
      { status: 500 }
    );
  }
}

// POST - Record a new transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: inventoryId } = await params;
    const body = await request.json();
    const { type, quantity, jobId, notes } = body;

    try {
      await checkPermission('manage_inventory');
    } catch (error) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate type
    const validTypes: TransactionType[] = ['check_in', 'check_out', 'adjustment', 'transfer', 'usage', 'restock', 'return', 'damaged', 'lost'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity === 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get current item and verify ownership
    const { data: item, error: itemError } = await supabase
      .from('business_inventory')
      .select('id, business_id, quantity, name')
      .eq('id', inventoryId)
      .eq('business_id', session.user.businessId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Calculate new quantity
    let quantityChange = quantity;
    if (['check_out', 'usage', 'damaged', 'lost', 'transfer'].includes(type)) {
      quantityChange = -Math.abs(quantity);
    } else if (['check_in', 'restock', 'return'].includes(type)) {
      quantityChange = Math.abs(quantity);
    }
    // 'adjustment' can be positive or negative as provided

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity + quantityChange;

    if (newQuantity < 0) {
      return NextResponse.json(
        { error: `Cannot reduce quantity below 0. Current: ${previousQuantity}, Requested: ${quantityChange}` },
        { status: 400 }
      );
    }

    // Create transaction record
    // Note: In a real app, this should be a transaction, but Supabase via REST doesn't support transactions easily
    // We'll update inventory first, then create transaction record
    
    const { error: updateError } = await supabase
      .from('business_inventory')
      .update({ quantity: newQuantity })
      .eq('id', inventoryId);

    if (updateError) {
      throw updateError;
    }

    const { data: transaction, error: txError } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_id: inventoryId,
        type,
        quantity: quantityChange,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        job_id: jobId,
        notes,
        performed_by: session.user.id,
        performed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      // Rollback? Ideally yes, but tricky here. Log critical error.
      apiLogger.error({ 
        msg: 'Failed to create transaction record after updating inventory', 
        error: txError,
        inventoryId,
        quantityChange 
      });
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    apiLogger.error({ error, context: 'create inventory transaction' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
