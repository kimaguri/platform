// User data models and interfaces

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface UserSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: User;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  role: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// Request interfaces
export interface AuthRequest {
  tenantId: string;
  email: string;
  password: string;
}

export interface RegisterRequest extends AuthRequest {
  userData?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdateRoleRequest {
  userId: string;
  role: string;
  permissions?: string[];
}

// Response interfaces
export interface LoginResponse {
  data?: {
    user: User;
    session: UserSession;
    accessToken: string;
  };
  error?: string;
  message: string;
}

export interface RegisterResponse {
  data?: {
    user: User;
    session?: UserSession;
  };
  error?: string;
  message: string;
}

export interface UserResponse {
  data?: User;
  error?: string;
  message: string;
}

export interface UserProfileResponse {
  data?: UserProfile;
  error?: string;
  message: string;
}

export interface UsersListResponse {
  data?: UserProfile[];
  error?: string;
  message: string;
}

// App Bootstrap interfaces
export interface DictionaryValue {
  id: string;
  dictionary_id: string;
  name?: string;
  value: string;
  order?: number;
  active?: boolean;
  parent_name?: string | null;
  default?: boolean;
  created_at?: string;
  created_by?: string;
}

export interface Dictionary {
  id: string;
  code: string;
  name: string;
  values_json?: any | null;
  comments?: string | null;
  created_at?: string;
  created_by?: string | null;
  dictionary_value: DictionaryValue[];
}

export interface ConfigParameter {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Resource {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  actions?: any | null;
  created_at?: string;
  created_by?: string | null;
}

export interface Permission {
  id: string;
  role_id: string;
  resource_code: string | null;
  resource_id: string;
  action: string;
  attributes?: any | null;
  conditions?: any | null;
  created_at?: string;
  created_by?: string | null;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  inherits?: string[];
  restrict_assign_activity: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PositionRole {
  role_id: string;
  role: Role;
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  position_role: PositionRole[];
}

export interface EmployeeData {
  id: string;
  user_id: string;
  full_name: string;
  organization_id: string;
  position_id: string;
  position: Position;
}

export interface AppBootstrapData {
  user: EmployeeData;
  dictionaries: Dictionary[];
  configParameters: ConfigParameter[];
  resources: Resource[];
  permissions: Permission[];
}

export interface AppBootstrapResponse {
  data?: AppBootstrapData;
  error?: string;
  message: string;
}
