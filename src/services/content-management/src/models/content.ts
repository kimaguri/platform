// Content data models and interfaces

export interface ContentEntity {
  id?: string; // Optional for creation
  created_at?: string;
  updated_at?: string;
  // Note: Dynamic fields will be handled as Record<string, any> in service layer
}

export interface ExtensionDefinition {
  id?: string;
  entity_type: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  default_value?: any;
  validation?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Request interfaces
export interface ListEntitiesRequest {
  entity: string;
  limit?: number;
  offset?: number;
}

export interface GetEntityRequest {
  entity: string;
  id: string;
}

export interface CreateEntityRequest {
  entity: string;
  data: Record<string, any>;
}

export interface UpdateEntityRequest {
  entity: string;
  id: string;
  data: Record<string, any>;
}

export interface UpsertEntityRequest {
  entity: string;
  data: Record<string, any>;
  conflictColumns?: string[];
}

export interface DeleteEntityRequest {
  entity: string;
  id: string;
}
