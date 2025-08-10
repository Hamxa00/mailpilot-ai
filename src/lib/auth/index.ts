/**
 * @fileoverview Authentication utilities index for MailPilot AI
 * @description Central exports for all authentication-related utilities
 * @author MailPilot AI Team
 * @version 1.0.0
 */

// Core Supabase auth utilities
export * from "./supabase-auth";

// Authentication middleware
export * from "./auth-middleware";

// Authentication service
export * from "./auth-service";

// Re-export auth schemas for convenience
export * from "../validation/schemas/auth-schemas";

// Type exports
export type { ExtendedUser, AuthResponse, Database } from "./supabase-auth";

export type { AuthContext, AuthMiddlewareOptions } from "./auth-middleware";

export type { RegistrationData, AuthResult } from "./auth-service";
