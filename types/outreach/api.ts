// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface OutreachApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedOutreachResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
