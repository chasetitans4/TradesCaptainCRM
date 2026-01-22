// =====================================================
// KEYSET PAGINATION UTILITIES
// Efficient cursor-based pagination for large datasets
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

// Use a generic type for the query builder to avoid version-specific type arguments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

// =====================================================
// TYPES
// =====================================================

export interface KeysetCursor {
  // The value of the primary sort column at the last item
  value: string | number | Date;
  // The ID of the last item (for tiebreaking)
  id: string;
}

export interface KeysetPaginationOptions {
  // Primary sort column
  sortColumn: string;
  // Sort direction
  sortDirection: 'asc' | 'desc';
  // Number of items per page
  pageSize: number;
  // Cursor from previous page (null for first page)
  cursor?: KeysetCursor | null;
}

export interface KeysetPaginationResult<T> {
  items: T[];
  nextCursor: KeysetCursor | null;
  hasMore: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Encode cursor for URL-safe transmission
 */
export function encodeCursor(cursor: KeysetCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json).toString('base64url');
}

/**
 * Decode cursor from URL-safe string
 */
export function decodeCursor(encoded: string): KeysetCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Apply keyset pagination to a Supabase query
 */
export function applyKeysetPagination<T>(
  query: QueryBuilder,
  options: KeysetPaginationOptions
): QueryBuilder {
  const { sortColumn, sortDirection, pageSize, cursor } = options;

  // Apply cursor filter if not first page
  if (cursor) {
    if (sortDirection === 'asc') {
      // For ascending: get items where (sortColumn > cursor.value) OR (sortColumn = cursor.value AND id > cursor.id)
      query = query.or(
        `${sortColumn}.gt.${cursor.value},and(${sortColumn}.eq.${cursor.value},id.gt.${cursor.id})`
      );
    } else {
      // For descending: get items where (sortColumn < cursor.value) OR (sortColumn = cursor.value AND id < cursor.id)
      query = query.or(
        `${sortColumn}.lt.${cursor.value},and(${sortColumn}.eq.${cursor.value},id.lt.${cursor.id})`
      );
    }
  }

  // Apply ordering
  query = query
    .order(sortColumn, { ascending: sortDirection === 'asc' })
    .order('id', { ascending: sortDirection === 'asc' });

  // Fetch one extra to check if there are more pages
  query = query.limit(pageSize + 1);

  return query;
}

/**
 * Process query result and extract pagination info
 */
export function processKeysetResult<T extends { id: string }>(
  items: T[],
  sortColumn: keyof T,
  pageSize: number
): KeysetPaginationResult<T> {
  const hasMore = items.length > pageSize;

  // Remove the extra item we fetched
  const pageItems = hasMore ? items.slice(0, pageSize) : items;

  // Generate cursor from last item
  let nextCursor: KeysetCursor | null = null;
  if (hasMore && pageItems.length > 0) {
    const lastItem = pageItems[pageItems.length - 1];
    nextCursor = {
      value: lastItem[sortColumn] as string | number | Date,
      id: lastItem.id,
    };
  }

  return {
    items: pageItems,
    nextCursor,
    hasMore,
  };
}

// =====================================================
// READY-TO-USE PAGINATION FUNCTIONS
// =====================================================

/**
 * Paginate customers with keyset pagination
 */
export async function paginateCustomers(
  businessId: string,
  options: {
    pageSize?: number;
    cursor?: string | null;
    sortBy?: 'name' | 'created_at' | 'updated_at';
    sortDirection?: 'asc' | 'desc';
    search?: string;
  }
): Promise<KeysetPaginationResult<any> & { cursor: string | null }> {
  const supabase = createAdminClient();
  const {
    pageSize = 50,
    cursor: cursorString,
    sortBy = 'name',
    sortDirection = 'asc',
    search,
  } = options;

  const cursor = cursorString ? decodeCursor(cursorString) : null;

  let query = supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  query = applyKeysetPagination(query, {
    sortColumn: sortBy,
    sortDirection,
    pageSize,
    cursor,
  });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const result = processKeysetResult(data || [], sortBy as keyof typeof data[0], pageSize);

  return {
    ...result,
    cursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
  };
}

/**
 * Paginate jobs with keyset pagination
 */
export async function paginateJobs(
  businessId: string,
  options: {
    pageSize?: number;
    cursor?: string | null;
    sortBy?: 'scheduled_date' | 'created_at' | 'updated_at';
    sortDirection?: 'asc' | 'desc';
    status?: string;
    assignedTo?: string;
    customerId?: string;
  }
): Promise<KeysetPaginationResult<any> & { cursor: string | null }> {
  const supabase = createAdminClient();
  const {
    pageSize = 50,
    cursor: cursorString,
    sortBy = 'scheduled_date',
    sortDirection = 'desc',
    status,
    assignedTo,
    customerId,
  } = options;

  const cursor = cursorString ? decodeCursor(cursorString) : null;

  let query = supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(id, name, phone)
    `)
    .eq('business_id', businessId);

  if (status) {
    query = query.eq('status', status);
  }

  if (assignedTo) {
    query = query.eq('assigned_user_id', assignedTo);
  }

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  query = applyKeysetPagination(query, {
    sortColumn: sortBy,
    sortDirection,
    pageSize,
    cursor,
  });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const result = processKeysetResult(data || [], sortBy as keyof typeof data[0], pageSize);

  return {
    ...result,
    cursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
  };
}

/**
 * Paginate invoices with keyset pagination
 */
export async function paginateInvoices(
  businessId: string,
  options: {
    pageSize?: number;
    cursor?: string | null;
    sortBy?: 'created_at' | 'due_date' | 'invoice_number';
    sortDirection?: 'asc' | 'desc';
    status?: string;
    customerId?: string;
  }
): Promise<KeysetPaginationResult<any> & { cursor: string | null }> {
  const supabase = createAdminClient();
  const {
    pageSize = 50,
    cursor: cursorString,
    sortBy = 'created_at',
    sortDirection = 'desc',
    status,
    customerId,
  } = options;

  const cursor = cursorString ? decodeCursor(cursorString) : null;

  let query = supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(id, name, email)
    `)
    .eq('business_id', businessId);

  if (status) {
    query = query.eq('status', status);
  }

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  query = applyKeysetPagination(query, {
    sortColumn: sortBy,
    sortDirection,
    pageSize,
    cursor,
  });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const result = processKeysetResult(data || [], sortBy as keyof typeof data[0], pageSize);

  return {
    ...result,
    cursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
  };
}

/**
 * Paginate SMS messages with keyset pagination
 */
export async function paginateSMSMessages(
  conversationId: string,
  options: {
    pageSize?: number;
    cursor?: string | null;
    sortDirection?: 'asc' | 'desc';
  }
): Promise<KeysetPaginationResult<any> & { cursor: string | null }> {
  const supabase = createAdminClient();
  const {
    pageSize = 50,
    cursor: cursorString,
    sortDirection = 'desc',
  } = options;

  const cursor = cursorString ? decodeCursor(cursorString) : null;

  let query = supabase
    .from('sms_messages')
    .select('*')
    .eq('conversation_id', conversationId);

  query = applyKeysetPagination(query, {
    sortColumn: 'created_at',
    sortDirection,
    pageSize,
    cursor,
  });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const result = processKeysetResult(data || [], 'created_at', pageSize);

  return {
    ...result,
    cursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
  };
}
