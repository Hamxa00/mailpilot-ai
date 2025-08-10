/**
 * @fileoverview Database connection utilities for MailPilot AI
 * @description Database connection management, health checks, and configuration
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { logger } from "../logging";

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database connection URL */
  url: string;

  /** Maximum number of connections in the pool */
  maxConnections?: number;

  /** Connection timeout in milliseconds */
  connectionTimeout?: number;

  /** Idle timeout in milliseconds */
  idleTimeout?: number;

  /** Query timeout in milliseconds */
  queryTimeout?: number;

  /** Enable SSL */
  ssl?: boolean;

  /** Enable debug mode */
  debug?: boolean;

  /** Enable Supabase RLS support */
  enableRLS?: boolean;
}

/**
 * Database connection status
 */
export interface DatabaseStatus {
  /** Connection status */
  connected: boolean;

  /** Connection timestamp */
  connectedAt?: Date;

  /** Last health check timestamp */
  lastHealthCheck?: Date;

  /** Number of active connections */
  activeConnections?: number;

  /** Connection pool size */
  poolSize?: number;

  /** Error message if connection failed */
  error?: string;
}

/**
 * Database connection singleton
 */
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private config: DatabaseConfig | null = null;
  private status: DatabaseStatus = { connected: false };
  private userContext: { userId?: string; role?: string } = {};

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database connection
   * @param config - Database configuration
   */
  public async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;

      const clientOptions: postgres.Options<{}> = {
        max: config.maxConnections || 20,
        connection: {
          connect_timeout: config.connectionTimeout || 30,
          idle_in_transaction_session_timeout: config.idleTimeout || 30000,
        },
        ssl: config.ssl ? "require" : false,
        debug: config.debug || false,
      };

      // Create PostgreSQL client
      this.client = postgres(config.url, clientOptions);

      // Create Drizzle instance
      this.db = drizzle(this.client, { schema });

      // Test connection
      await this.healthCheck();

      this.status = {
        connected: true,
        connectedAt: new Date(),
        lastHealthCheck: new Date(),
        poolSize: config.maxConnections || 20,
      };

      logger.info("Database connection initialized successfully", {
        url: config.url.replace(/:[^:@]*@/, ":***@"), // Hide password
        maxConnections: config.maxConnections,
      });
    } catch (error) {
      this.status = {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      logger.error("Failed to initialize database connection", {
        error: error instanceof Error ? error.message : error,
        url: config.url.replace(/:[^:@]*@/, ":***@"),
      });

      throw new Error(
        `Database connection failed: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Get the database instance
   */
  public getDatabase(): ReturnType<typeof drizzle> {
    if (!this.db || !this.status.connected) {
      throw new Error("Database not initialized or connection lost");
    }
    return this.db;
  }

  /**
   * Get the raw client instance
   */
  public getClient(): postgres.Sql {
    if (!this.client || !this.status.connected) {
      throw new Error("Database client not initialized or connection lost");
    }
    return this.client;
  }

  /**
   * Get connection status
   */
  public getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  /**
   * Perform health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error("Database client not initialized");
      }

      // Simple query to test connection
      await this.client`SELECT 1`;

      this.status.lastHealthCheck = new Date();

      if (!this.status.connected) {
        this.status.connected = true;
        logger.info("Database connection restored");
      }

      return true;
    } catch (error) {
      this.status.connected = false;
      this.status.error =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("Database health check failed", {
        error: error instanceof Error ? error.message : error,
      });

      return false;
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end();
        this.client = null;
        this.db = null;
        this.status.connected = false;

        logger.info("Database connection closed");
      }
    } catch (error) {
      logger.error("Error closing database connection", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
  } {
    if (!this.client) {
      return {
        totalConnections: 0,
        idleConnections: 0,
        activeConnections: 0,
      };
    }

    // Note: postgres.js doesn't expose detailed connection stats
    // This is a placeholder for future implementation
    return {
      totalConnections: this.config?.maxConnections || 20,
      idleConnections: 0,
      activeConnections: 0,
    };
  }

  /**
   * Set user context for RLS policies
   */
  public setUserContext(userId: string, role?: string): void {
    this.userContext = { userId, role };
  }

  /**
   * Get database with user context for RLS policies
   */
  public async getDatabaseWithUserContext(userId?: string): Promise<ReturnType<typeof drizzle>> {
    const db = this.getDatabase();
    
    if ((userId || this.userContext.userId) && this.config?.enableRLS) {
      const contextUserId = userId || this.userContext.userId;
      
      try {
        // Set user context for RLS policies
        if (typeof contextUserId === "string") {
          await this.client!`SET LOCAL rls.user_id = ${contextUserId}`;
          logger.debug("User context set for database session", { userId: contextUserId });
        } else {
          logger.warn("User context not set: userId is undefined or not a string", { userId: contextUserId });
        }
      } catch (error) {
        logger.warn("Failed to set user context", { error, userId: contextUserId });
      }
    }
    
    return db;
  }

  /**
   * Execute operation with user context
   */
  public async executeWithUserContext<T>(
    userId: string,
    operation: (db: ReturnType<typeof drizzle>) => Promise<T>
  ): Promise<T> {
    const db = await this.getDatabaseWithUserContext(userId);
    return await operation(db);
  }
}

// Export singleton instance
export const databaseConnection = DatabaseConnection.getInstance();

/**
 * Initialize database with environment configuration
 */
export const initializeDatabase = async (
  customConfig?: Partial<DatabaseConfig>
): Promise<void> => {
  const config: DatabaseConfig = {
    url: process.env.DATABASE_URL || "",
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "20"),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000"),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || "60000"),
    ssl: process.env.NODE_ENV === "production",
    debug: process.env.NODE_ENV === "development",
    ...customConfig,
  };

  if (!config.url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  await databaseConnection.initialize(config);
};

/**
 * Get database instance
 */
export const getDatabase = () => {
  return databaseConnection.getDatabase();
};

/**
 * Get database client
 */
export const getDatabaseClient = () => {
  return databaseConnection.getClient();
};

/**
 * Check database health
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  return await databaseConnection.healthCheck();
};

/**
 * Get database status
 */
export const getDatabaseStatus = (): DatabaseStatus => {
  return databaseConnection.getStatus();
};

/**
 * Close database connection
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  await databaseConnection.close();
};

/**
 * Database middleware for Next.js API routes
 */
export const withDatabase = <T extends any[]>(
  handler: (...args: T) => Promise<any>
) => {
  return async (...args: T): Promise<any> => {
    try {
      // Ensure database is connected
      if (!databaseConnection.getStatus().connected) {
        await checkDatabaseHealth();
      }

      return await handler(...args);
    } catch (error) {
      logger.error("Database middleware error", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };
};

/**
 * Set user context for RLS policies
 */
export const setUserContext = (userId: string, role?: string): void => {
  databaseConnection.setUserContext(userId, role);
};

/**
 * Execute database operation with user context for RLS
 */
export const executeWithUserContext = async <T>(
  userId: string,
  operation: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> => {
  return await databaseConnection.executeWithUserContext(userId, operation);
};

/**
 * Get database with user context set
 */
export const getDatabaseWithUserContext = async (userId?: string): Promise<ReturnType<typeof drizzle>> => {
  return await databaseConnection.getDatabaseWithUserContext(userId);
};