// =====================================================
// API PAGINATION & FIELD SELECTION
// Utilities for optimized API responses
// =====================================================


// =====================================================
// PAGINATION
// =====================================================

export interface PaginationParams {
  page: number;
  limit: number;
  cursor?: string;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * Extract pagination parameters from request
 */
export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const cursor = searchParams.get('cursor') || undefined;
  const offset = (page - 1) * limit;

  return { page, limit, cursor, offset };
}

/**
 * Build a paginated response
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
  cursorField?: string
): PaginatedResponse<T> {
  const { page, limit } = params;
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  let nextCursor: string | undefined;
  if (hasMore && cursorField && data.length > 0) {
    const lastItem = data[data.length - 1] as any;
    nextCursor = lastItem[cursorField]?.toString();
  }

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
      ...(nextCursor && { nextCursor }),
    },
  };
}

/**
 * Apply cursor-based pagination to Supabase query
 */
export function applyCursorPagination(
  query: any,
  cursor: string | undefined,
  cursorField: string = 'created_at',
  ascending: boolean = false
): any {
  if (cursor) {
    if (ascending) {
      query = query.gt(cursorField, cursor);
    } else {
      query = query.lt(cursorField, cursor);
    }
  }
  return query;
}

// =====================================================
// FIELD SELECTION
// =====================================================

// Allowed fields per entity type (whitelist for security)
const ALLOWED_FIELDS: Record<string, string[]> = {
  customer: [
    'id', 'name', 'email', 'phone', 'address', 'city', 'state', 'zip',
    'company_name', 'notes', 'tags', 'is_active', 'created_at', 'updated_at',
  ],
  job: [
    'id', 'title', 'description', 'status', 'scheduled_date', 'scheduled_time',
    'customer_id', 'assigned_to', 'total', 'created_at', 'updated_at',
  ],
  lead: [
    'id', 'name', 'email', 'phone', 'source', 'status', 'notes',
    'follow_up_date', 'created_at', 'updated_at',
  ],
  quote: [
    'id', 'title', 'status', 'customer_id', 'subtotal', 'tax', 'total',
    'valid_until', 'notes', 'created_at', 'updated_at',
  ],
  invoice: [
    'id', 'invoice_number', 'status', 'customer_id', 'job_id',
    'subtotal', 'tax', 'total', 'due_date', 'paid_at', 'created_at',
  ],
  message: [
    'id', 'customer_id', 'direction', 'type', 'content',
    'read_at', 'created_at',
  ],
  equipment: [
    'id', 'customer_id', 'model_number', 'serial_number', 'location',
    'status', 'install_date', 'warranty_expiration', 'created_at',
  ],
};

/**
 * Parse and validate field selection
 */
export function parseFieldSelection(
  entityType: string,
  fieldsParam?: string | null
): string {
  if (!fieldsParam) {
    return '*';
  }

  const requested = fieldsParam.split(',').map(f => f.trim().toLowerCase());
  const allowed = ALLOWED_FIELDS[entityType] || [];

  // Filter to only allowed fields
  const valid = requested.filter(f => allowed.includes(f));

  // Always include 'id' for consistency
  if (!valid.includes('id')) {
    valid.unshift('id');
  }

  return valid.length > 0 ? valid.join(', ') : 'id';
}

/**
 * Validate that requested fields are allowed
 */
export function validateFields(
  entityType: string,
  fields: string[]
): { valid: boolean; invalidFields: string[] } {
  const allowed = ALLOWED_FIELDS[entityType] || [];
  const invalidFields = fields.filter(f => !allowed.includes(f));

  return {
    valid: invalidFields.length === 0,
    invalidFields,
  };
}

// =====================================================
// SORTING
// =====================================================

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const SORTABLE_FIELDS: Record<string, string[]> = {
  customer: ['name', 'email', 'created_at', 'updated_at'],
  job: ['scheduled_date', 'created_at', 'status', 'total'],
  lead: ['name', 'created_at', 'follow_up_date', 'status'],
  quote: ['created_at', 'valid_until', 'total', 'status'],
  invoice: ['created_at', 'due_date', 'total', 'status'],
};

/**
 * Parse and validate sort parameters
 */
export function getSortParams(
  entityType: string,
  searchParams: URLSearchParams
): SortParams {
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const allowed = SORTABLE_FIELDS[entityType] || ['created_at'];

  return {
    sortBy: allowed.includes(sortBy) ? sortBy : 'created_at',
    sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc',
  };
}

// =====================================================
// FILTERING
// =====================================================

export interface FilterParams {
  [key: string]: string | string[] | undefined;
}

/**
 * Parse filter parameters from request
 */
export function getFilterParams(
  searchParams: URLSearchParams,
  allowedFilters: string[]
): FilterParams {
  const filters: FilterParams = {};

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter);
    if (value) {
      // Check if it's a comma-separated list
      if (value.includes(',')) {
        filters[filter] = value.split(',').map(v => v.trim());
      } else {
        filters[filter] = value;
      }
    }
  }

  return filters;
}

/**
 * Apply filters to Supabase query
 */
export function applyFilters(
  query: any,
  filters: FilterParams,
  filterConfig: Record<string, 'eq' | 'ilike' | 'in' | 'gte' | 'lte'>
): any {
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;

    const operator = filterConfig[key] || 'eq';

    switch (operator) {
      case 'eq':
        query = query.eq(key, value);
        break;
      case 'ilike':
        query = query.ilike(key, `%${value}%`);
        break;
      case 'in':
        query = query.in(key, Array.isArray(value) ? value : [value]);
        break;
      case 'gte':
        query = query.gte(key, value);
        break;
      case 'lte':
        query = query.lte(key, value);
        break;
    }
  }

  return query;
}

// =====================================================
// RESPONSE HELPERS
// =====================================================

/**
 * Build optimized API response
 */
export function buildApiResponse<T>(
  data: T,
  options: {
    cache?: 'no-store' | 'force-cache' | number; // number = max-age in seconds
    status?: number;
  } = {}
): Response {
  const { cache, status = 200 } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (cache === 'no-store') {
    headers['Cache-Control'] = 'no-store';
  } else if (cache === 'force-cache') {
    headers['Cache-Control'] = 'public, max-age=31536000';
  } else if (typeof cache === 'number') {
    headers['Cache-Control'] = `public, max-age=${cache}`;
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Build error response
 */
export function buildErrorResponse(
  message: string,
  status: number = 400,
  details?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details && { details }),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
