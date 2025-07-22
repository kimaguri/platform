// Universal Supabase Response Types
// Based on Supabase documentation and PostgREST standard format

/**
 * Standard Supabase/PostgREST query response structure
 * This matches the actual response format from supabase-js client
 */
export interface SupabaseResponse<T = any> {
  data: T | null;
  error: SupabaseError | null;
  count?: number | null;
  status: number;
  statusText: string;
}

/**
 * Supabase/PostgREST standard error format
 * Follows PostgreSQL error structure
 */
export interface SupabaseError {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}

/**
 * Simplified response for Encore.ts API endpoints
 * Avoids complex types that Encore.ts doesn't support
 */
export interface SimpleSupabaseResponse {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}

/**
 * Response for single entity operations
 */
export interface EntityResponse {
  success: boolean;
  message: string;
  entityId?: string;
  error?: string;
}

/**
 * Response for list operations
 */
export interface ListResponse {
  success: boolean;
  message: string;
  count: number;
  total?: number;
  error?: string;
}

/**
 * Response for delete operations
 */
export interface DeleteResponse {
  success: boolean;
  message: string;
  deletedCount?: number;
  error?: string;
}

/**
 * Helper function to convert Supabase response to simple response
 */
export function toSimpleResponse<T>(
  supabaseResponse: SupabaseResponse<T>,
  successMessage: string = 'Operation completed successfully'
): SimpleSupabaseResponse {
  if (supabaseResponse.error) {
    return {
      success: false,
      message: supabaseResponse.error.message,
      error: supabaseResponse.error.details || supabaseResponse.error.message,
    };
  }

  return {
    success: true,
    message: successMessage,
    count: Array.isArray(supabaseResponse.data) ? supabaseResponse.data.length : 1,
  };
}

/**
 * Helper function to convert Supabase response to entity response
 */
export function toEntityResponse<T extends { id?: string }>(
  supabaseResponse: SupabaseResponse<T>,
  successMessage: string = 'Entity operation completed successfully'
): EntityResponse {
  if (supabaseResponse.error) {
    return {
      success: false,
      message: supabaseResponse.error.message,
      error: supabaseResponse.error.details || supabaseResponse.error.message,
    };
  }

  return {
    success: true,
    message: successMessage,
    entityId: supabaseResponse.data?.id || undefined,
  };
}

/**
 * Helper function to convert Supabase response to list response
 */
export function toListResponse<T>(
  supabaseResponse: SupabaseResponse<T[]>,
  successMessage: string = 'List retrieved successfully'
): ListResponse {
  if (supabaseResponse.error) {
    return {
      success: false,
      message: supabaseResponse.error.message,
      count: 0,
      error: supabaseResponse.error.details || supabaseResponse.error.message,
    };
  }

  const data = supabaseResponse.data || [];
  return {
    success: true,
    message: successMessage,
    count: data.length,
    total: supabaseResponse.count || data.length,
  };
}

/**
 * Helper function to convert Supabase response to delete response
 */
export function toDeleteResponse(
  supabaseResponse: SupabaseResponse<any>,
  successMessage: string = 'Entity deleted successfully'
): DeleteResponse {
  if (supabaseResponse.error) {
    return {
      success: false,
      message: supabaseResponse.error.message,
      deletedCount: 0,
      error: supabaseResponse.error.details || supabaseResponse.error.message,
    };
  }

  return {
    success: true,
    message: successMessage,
    deletedCount: Array.isArray(supabaseResponse.data) ? supabaseResponse.data.length : 1,
  };
}
