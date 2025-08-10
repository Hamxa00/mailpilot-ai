/**
 * @fileoverview Database transaction utilities for MailPilot AI
 * @description Transaction management, rollback handling, and atomic operations
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { PgTransaction } from "drizzle-orm/pg-core";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { getDatabase, getDatabaseClient } from "./database-connection";
import { logger } from "../logging";
import { measureAsync } from "../logging/log-utilities";

/**
 * Transaction options
 */
export interface TransactionOptions {
  /** Transaction timeout in milliseconds */
  timeout?: number;

  /** Isolation level */
  isolationLevel?:
    | "READ UNCOMMITTED"
    | "READ COMMITTED"
    | "REPEATABLE READ"
    | "SERIALIZABLE";

  /** Read-only transaction */
  readOnly?: boolean;

  /** Transaction name for logging */
  name?: string;

  /** Maximum retry attempts for serialization failures */
  maxRetries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Transaction result
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retries?: number;
  duration?: number;
}

/**
 * Transaction context
 */
export type TransactionContext = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

/**
 * Transaction function type
 */
export type TransactionFunction<T> = (tx: TransactionContext) => Promise<T>;

/**
 * Database transaction manager
 */
export class DatabaseTransactionManager {
  private static instance: DatabaseTransactionManager;
  private activeTransactions = new Map<
    string,
    { startTime: Date; name?: string }
  >();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseTransactionManager {
    if (!DatabaseTransactionManager.instance) {
      DatabaseTransactionManager.instance = new DatabaseTransactionManager();
    }
    return DatabaseTransactionManager.instance;
  }

  /**
   * Execute function within a transaction
   * @param fn - Function to execute in transaction
   * @param options - Transaction options
   * @returns Transaction result
   */
  public async execute<T>(
    fn: TransactionFunction<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const transactionId = crypto.randomUUID();
    const startTime = Date.now();
    let retries = 0;
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 100;

    // Register active transaction
    this.activeTransactions.set(transactionId, {
      startTime: new Date(),
      name: options.name,
    });

    try {
      const result = await measureAsync(
        "database_transaction",
        async () => {
          while (retries <= maxRetries) {
            try {
              const db = getDatabase();

              return await db.transaction(
                async (tx) => {
                  // Set transaction options
                  if (options.isolationLevel) {
                    await tx.execute(
                      `SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`
                    );
                  }

                  if (options.readOnly) {
                    await tx.execute("SET TRANSACTION READ ONLY");
                  }

                  if (options.timeout) {
                    await tx.execute(
                      `SET statement_timeout = ${options.timeout}`
                    );
                  }

                  logger.debug("Transaction started", {
                    transactionId,
                    name: options.name,
                    isolationLevel: options.isolationLevel,
                    readOnly: options.readOnly,
                  });

                  const result = await fn(tx);

                  logger.debug("Transaction completed successfully", {
                    transactionId,
                    name: options.name,
                    duration: Date.now() - startTime,
                  });

                  return result;
                },
                {
                  accessMode: options.readOnly ? "read only" : "read write",
                  isolationLevel: options.isolationLevel
                    ?.toLowerCase()
                    .replace(" ", "_") as any,
                }
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              // Check if it's a serialization error that can be retried
              if (
                retries < maxRetries &&
                (errorMessage.includes("serialization_failure") ||
                  errorMessage.includes("deadlock_detected") ||
                  errorMessage.includes("could not serialize"))
              ) {
                retries++;
                logger.warn("Transaction failed, retrying", {
                  transactionId,
                  name: options.name,
                  attempt: retries,
                  maxRetries,
                  error: errorMessage,
                });

                // Exponential backoff
                await new Promise((resolve) =>
                  setTimeout(resolve, retryDelay * Math.pow(2, retries - 1))
                );
                continue;
              }

              throw error;
            }
          }

          throw new Error(`Transaction failed after ${maxRetries} retries`);
        },
        {
          transactionId,
          name: options.name,
          retries,
        }
      );

      return {
        success: true,
        data: result,
        retries,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("Transaction failed", {
        transactionId,
        name: options.name,
        error: errorMessage,
        retries,
        duration: Date.now() - startTime,
      });

      return {
        success: false,
        error: errorMessage,
        retries,
        duration: Date.now() - startTime,
      };
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Execute multiple operations atomically
   * @param operations - Array of operations to execute
   * @param options - Transaction options
   * @returns Transaction result with all operation results
   */
  public async executeBatch<T>(
    operations: Array<TransactionFunction<T>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.execute(
      async (tx) => {
        const results: T[] = [];

        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];
          logger.debug("Executing batch operation", {
            operationIndex: i,
            totalOperations: operations.length,
            name: options.name,
          });

          const result = await operation(tx);
          results.push(result);
        }

        return results;
      },
      {
        ...options,
        name: options.name || `batch_${operations.length}_operations`,
      }
    );
  }

  /**
   * Get active transaction count
   */
  public getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  /**
   * Get active transaction details
   */
  public getActiveTransactions(): Array<{
    id: string;
    startTime: Date;
    duration: number;
    name?: string;
  }> {
    const now = new Date();
    return Array.from(this.activeTransactions.entries()).map(
      ([id, { startTime, name }]) => ({
        id,
        startTime,
        duration: now.getTime() - startTime.getTime(),
        name,
      })
    );
  }

  /**
   * Check for long-running transactions
   * @param thresholdMs - Threshold in milliseconds
   * @returns Array of long-running transactions
   */
  public getLongRunningTransactions(thresholdMs: number = 30000) {
    const now = new Date();
    return this.getActiveTransactions().filter(
      (transaction) => transaction.duration > thresholdMs
    );
  }
}

// Export singleton instance
export const transactionManager = DatabaseTransactionManager.getInstance();

/**
 * Execute function within a transaction
 * @param fn - Function to execute in transaction
 * @param options - Transaction options
 * @returns Transaction result
 */
export const withTransaction = async <T>(
  fn: TransactionFunction<T>,
  options: TransactionOptions = {}
): Promise<TransactionResult<T>> => {
  return transactionManager.execute(fn, options);
};

/**
 * Execute multiple operations atomically
 * @param operations - Array of operations to execute
 * @param options - Transaction options
 * @returns Transaction result with all operation results
 */
export const withBatchTransaction = async <T>(
  operations: Array<TransactionFunction<T>>,
  options: TransactionOptions = {}
): Promise<TransactionResult<T[]>> => {
  return transactionManager.executeBatch(operations, options);
};

/**
 * Savepoint utilities for nested transactions
 */
export class SavepointManager {
  private static savepointCounter = 0;

  /**
   * Create a savepoint within a transaction
   * @param tx - Transaction context
   * @param name - Savepoint name (optional)
   * @returns Savepoint name
   */
  public static async createSavepoint(
    tx: TransactionContext,
    name?: string
  ): Promise<string> {
    const savepointName = name || `sp_${++SavepointManager.savepointCounter}`;
    await tx.execute(`SAVEPOINT ${savepointName}`);

    logger.debug("Savepoint created", { savepointName });
    return savepointName;
  }

  /**
   * Release a savepoint
   * @param tx - Transaction context
   * @param name - Savepoint name
   */
  public static async releaseSavepoint(
    tx: TransactionContext,
    name: string
  ): Promise<void> {
    await tx.execute(`RELEASE SAVEPOINT ${name}`);
    logger.debug("Savepoint released", { savepointName: name });
  }

  /**
   * Rollback to a savepoint
   * @param tx - Transaction context
   * @param name - Savepoint name
   */
  public static async rollbackToSavepoint(
    tx: TransactionContext,
    name: string
  ): Promise<void> {
    await tx.execute(`ROLLBACK TO SAVEPOINT ${name}`);
    logger.debug("Rolled back to savepoint", { savepointName: name });
  }
}

/**
 * Create a savepoint
 * @param tx - Transaction context
 * @param name - Savepoint name (optional)
 * @returns Savepoint name
 */
export const createSavepoint = (
  tx: TransactionContext,
  name?: string
): Promise<string> => {
  return SavepointManager.createSavepoint(tx, name);
};

/**
 * Release a savepoint
 * @param tx - Transaction context
 * @param name - Savepoint name
 */
export const releaseSavepoint = (
  tx: TransactionContext,
  name: string
): Promise<void> => {
  return SavepointManager.releaseSavepoint(tx, name);
};

/**
 * Rollback to a savepoint
 * @param tx - Transaction context
 * @param name - Savepoint name
 */
export const rollbackToSavepoint = (
  tx: TransactionContext,
  name: string
): Promise<void> => {
  return SavepointManager.rollbackToSavepoint(tx, name);
};

/**
 * Transaction middleware for API routes
 * @param options - Transaction options
 * @returns Middleware function
 */
export const withTransactionMiddleware = (options: TransactionOptions = {}) => {
  return async <T extends any[]>(
    handler: (tx: TransactionContext, ...args: T) => Promise<any>
  ) => {
    return async (...args: T): Promise<any> => {
      const result = await withTransaction(async (tx) => {
        return handler(tx, ...args);
      }, options);

      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      return result.data;
    };
  };
};

/**
 * Utility for retrying database operations
 * @param operation - Operation to retry
 * @param maxRetries - Maximum retry attempts
 * @param delay - Delay between retries
 * @returns Operation result
 */
export const retryDatabaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      logger.warn("Database operation failed, retrying", {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        error: lastError.message,
      });

      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt))
      );
    }
  }

  throw lastError!;
};

/**
 * Get database transaction statistics
 */
export const getTransactionStats = () => {
  return {
    activeTransactions: transactionManager.getActiveTransactionCount(),
    activeTransactionDetails: transactionManager.getActiveTransactions(),
    longRunningTransactions: transactionManager.getLongRunningTransactions(),
  };
};
