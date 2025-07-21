import { api, Header, Query } from "encore.dev/api";
import { getSupabaseServiceClient } from "../../../src/shared/supabaseClient";
import { ExtensionDefinition, ApiResponse } from "../../../src/shared/types";

interface ListDefinitionsRequest {
  tenantId: Header<"X-Tenant-ID">; // Получаем tenant ID из заголовка
  entityType?: Query<string>; // Фильтр по типу сущности (опциональный)
}

interface CreateDefinitionRequest {
  tenantId: Header<"X-Tenant-ID">;
  entityType: string;
  fieldName: string;
  fieldType: "string" | "number" | "boolean" | "date" | "json";
  isRequired?: boolean;
  defaultValue?: any;
  validation?: Record<string, any>;
}

interface UpdateDefinitionRequest {
  tenantId: Header<"X-Tenant-ID">;
  id: string; // ID определения для обновления
  fieldName?: string;
  fieldType?: "string" | "number" | "boolean" | "date" | "json";
  isRequired?: boolean;
  defaultValue?: any;
  validation?: Record<string, any>;
}

interface DeleteDefinitionRequest {
  tenantId: Header<"X-Tenant-ID">;
  id: string; // ID определения для удаления
}

/**
 * Получить список определений расширений
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const listDefinitions = api(
  { method: "GET", path: "/definitions", expose: true },
  async ({ tenantId, entityType }: ListDefinitionsRequest): Promise<ApiResponse<ExtensionDefinition[]>> => {
    try {
      const supabase = getSupabaseServiceClient(tenantId);
      
      let query = supabase
        .from("extensions_definitions")
        .select("*");

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }

      const { data, error } = await query;

      if (error) {
        return {
          error: error.message,
          message: "Failed to fetch definitions"
        };
      }

      return {
        data: data || [],
        message: "Definitions retrieved successfully"
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch definitions",
        message: "Failed to fetch definitions"
      };
    }
  }
);

/**
 * Создать новое определение расширения
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const createDefinition = api(
  { method: "POST", path: "/definitions", expose: true },
  async ({ tenantId, entityType, fieldName, fieldType, isRequired, defaultValue, validation }: CreateDefinitionRequest): Promise<ApiResponse<ExtensionDefinition>> => {
    try {
      const supabase = getSupabaseServiceClient(tenantId);
      
      const { data, error } = await supabase
        .from("extensions_definitions")
        .insert({
          entity_type: entityType,
          field_name: fieldName,
          field_type: fieldType,
          is_required: isRequired || false,
          default_value: defaultValue,
          validation: validation || {}
        })
        .select()
        .single();

      if (error) {
        return {
          error: error.message,
          message: "Failed to create definition"
        };
      }

      return {
        data,
        message: "Definition created successfully"
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to create definition",
        message: "Failed to create definition"
      };
    }
  }
);

/**
 * Обновить определение расширения
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const updateDefinition = api(
  { method: "PUT", path: "/definitions/:id", expose: true },
  async ({ tenantId, id, fieldName, fieldType, isRequired, defaultValue, validation }: UpdateDefinitionRequest): Promise<ApiResponse<ExtensionDefinition>> => {
    try {
      const supabase = getSupabaseServiceClient(tenantId);
      
      const updateData: any = {};
      if (fieldName !== undefined) updateData.field_name = fieldName;
      if (fieldType !== undefined) updateData.field_type = fieldType;
      if (isRequired !== undefined) updateData.is_required = isRequired;
      if (defaultValue !== undefined) updateData.default_value = defaultValue;
      if (validation !== undefined) updateData.validation = validation;

      const { data, error } = await supabase
        .from("extensions_definitions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          error: error.message,
          message: "Failed to update definition"
        };
      }

      return {
        data,
        message: "Definition updated successfully"
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to update definition",
        message: "Failed to update definition"
      };
    }
  }
);

/**
 * Удалить определение расширения
 * Tenant ID передается через заголовок X-Tenant-ID
 */
export const deleteDefinition = api(
  { method: "DELETE", path: "/definitions/:id", expose: true },
  async ({ tenantId, id }: DeleteDefinitionRequest): Promise<ApiResponse<null>> => {
    try {
      const supabase = getSupabaseServiceClient(tenantId);
      
      const { error } = await supabase
        .from("extensions_definitions")
        .delete()
        .eq("id", id);

      if (error) {
        return {
          error: error.message,
          message: "Failed to delete definition"
        };
      }

      return {
        data: null,
        message: "Definition deleted successfully"
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to delete definition",
        message: "Failed to delete definition"
      };
    }
  }
);
