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
