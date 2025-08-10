/**
 * @fileoverview Authentication and authorization types for MailPilot AI
 * @description Type definitions for auth system
 * @author MailPilot AI Team
 * @version 1.0.0
 */

/**
 * User roles in the system
 */
export type UserRole = "user" | "admin" | "super_admin";

/**
 * System permissions
 */
export type Permission =
  | "read_emails"
  | "write_emails"
  | "delete_emails"
  | "manage_folders"
  | "access_analytics"
  | "manage_users"
  | "manage_subscriptions"
  | "access_admin_panel";

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session data
 */
export interface SessionData {
  id: string;
  userId: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * JWT token payload
 */
export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * User registration data
 */
export interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Authentication context
 */
export interface AuthContext {
  user: User;
  session: SessionData;
  token: AuthTokenPayload;
  request?: {
    ip?: string;
    userAgent?: string;
    method?: string;
    url?: string;
  };
}

/**
 * Authorization context
 */
export interface AuthorizationContext {
  user: User;
  request?: {
    ip?: string;
    userAgent?: string;
    method?: string;
    url?: string;
  };
  resource?: ResourceContext;
}

/**
 * Resource context for authorization
 */
export interface ResourceContext {
  type: string;
  id?: string;
  ownerId?: string;
  metadata?: Record<string, any>;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
}
