/**
 * @fileoverview Base repository pattern for MailPilot AI
 * @description Generic repository pattern implementation with common CRUD operations
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import {
  eq,
  sql,
  and,
  or,
  desc,
  asc,
  like,
  ilike,
  isNull,
  isNotNull,
  inArray,
  SQL,
} from "drizzle-orm";
import { PgTable, PgColumn } from "drizzle-orm/pg-core";
import * as dbConnection from "./database-connection";
import { logger } from "../logging";
import { measureAsync } from "../logging/log-utilities";

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository filter options
 */
export interface FilterOptions {
  /** Fields to filter by */
  where?: Record<string, any>;

  /** Order by clauses */
  orderBy?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;

  /** Pagination */
  limit?: number;
  offset?: number;

  /** Fields to select */
  select?: string[];

  /** Relations to include */
  include?: string[];

  /** Search term for text search */
  search?: {
    term: string;
    fields: string[];
  };
}

/**
 * Repository query result
 */
export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  page?: number;
  limit?: number;
}

/**
 * Repository operation result
 */
export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  affectedRows?: number;
}

/**
 * Base repository class
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract table: PgTable;
  protected abstract entityName: string;

  /**
   * Get the ID column for the table
   */
  protected get idColumn(): PgColumn {
    return (this.table as any).id as PgColumn;
  }

  /**
   * Get database instance
   */
  protected get db() {
    return dbConnection.getDatabase();
  }

  /**
   * Create a new entity
   * @param data - Entity data to create
   * @returns Created entity
   */
  public async create(
    data: Omit<T, "id" | "createdAt" | "updatedAt">
  ): Promise<RepositoryResult<T>> {
    try {
      const result = await measureAsync(
        `${this.entityName}_create`,
        async () => {
          const now = new Date();
          const entityData = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
          } as any;

          const [created] = await this.db
            .insert(this.table)
            .values(entityData)
            .returning();

          return created;
        },
        { entityName: this.entityName }
      );

      logger.info(`${this.entityName} created`, {
        entityId: result.id,
        entityName: this.entityName,
      });

      return {
        success: true,
        data: result as unknown as T,
        affectedRows: 1,
      };
    } catch (error) {
      logger.error(`Failed to create ${this.entityName}`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create multiple entities
   * @param dataArray - Array of entity data to create
   * @returns Created entities
   */
  public async createMany(
    data: Array<Omit<T, "id" | "createdAt" | "updatedAt">>
  ): Promise<RepositoryResult<T[]>> {
    try {
      const result = await measureAsync(
        `${this.entityName}_create_many`,
        async () => {
          const now = new Date();
          const entitiesData = data.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
          })) as any[];

          const created = await this.db
            .insert(this.table)
            .values(entitiesData)
            .returning();

          return created;
        },
        { entityName: this.entityName, count: data.length }
      );

      logger.info(`${data.length} ${this.entityName}s created`, {
        count: data.length,
        entityName: this.entityName,
      });

      return {
        success: true,
        data: result as unknown as T[],
        affectedRows: result.length,
      };
    } catch (error) {
      logger.error(`Failed to create ${this.entityName}s`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        count: data.length,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Find entity by ID
   * @param id - Entity ID
   * @returns Found entity or null
   */
  public async findById(id: string): Promise<T | null> {
    try {
      const result = await measureAsync(
        `${this.entityName}_find_by_id`,
        async () => {
          const [entity] = await this.db
            .select()
            .from(this.table)
            .where(eq(this.idColumn, id))
            .limit(1);

          return entity;
        },
        { entityName: this.entityName, entityId: id }
      );

      return (result as T) || null;
    } catch (error) {
      logger.error(`Failed to find ${this.entityName} by ID`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        entityId: id,
      });
      return null;
    }
  }

  /**
   * Find entities with filtering
   * @param options - Filter options
   * @returns Query result with entities
   */
  public async find(options: FilterOptions = {}): Promise<QueryResult<T>> {
    try {
      const result = await measureAsync(
        `${this.entityName}_find`,
        async () => {
          let query = this.db.select().from(this.table);

          // Apply where conditions
          if (options.where) {
            const conditions = this.buildWhereConditions(options.where);
            if (conditions.length > 0) {
              query = query.where(and(...conditions)) as any;
            }
          }

          // Apply search
          if (options.search) {
            const searchConditions = this.buildSearchConditions(
              options.search.term,
              options.search.fields
            );
            if (searchConditions.length > 0) {
              query = query.where(or(...searchConditions)) as any;
            }
          }

          // Apply ordering
          if (options.orderBy) {
            const orderConditions = options.orderBy.map(
              ({ field, direction }) => {
                const column = (this.table as any)[field];
                return direction === "desc" ? desc(column) : asc(column);
              }
            );
            query = query.orderBy(...orderConditions) as any;
          }

          // Apply pagination
          if (options.limit) {
            query = query.limit(options.limit) as any;
          }
          if (options.offset) {
            query = query.offset(options.offset) as any;
          }

          const entities = await query;

          // Get total count for pagination
          let totalQuery = this.db
            .select({ count: sql<number>`count(*)` })
            .from(this.table);

          if (options.where) {
            const conditions = this.buildWhereConditions(options.where);
            if (conditions.length > 0) {
              totalQuery = totalQuery.where(and(...conditions)) as any;
            }
          }

          if (options.search) {
            const searchConditions = this.buildSearchConditions(
              options.search.term,
              options.search.fields
            );
            if (searchConditions.length > 0) {
              totalQuery = totalQuery.where(or(...searchConditions)) as any;
            }
          }

          const [{ count: total }] = await totalQuery;

          return {
            entities: entities as T[],
            total,
          };
        },
        { entityName: this.entityName, ...options }
      );

      const hasMore = options.limit
        ? (options.offset || 0) + options.limit < result.total
        : false;

      return {
        data: result.entities,
        total: result.total,
        hasMore,
        page:
          options.limit && options.offset
            ? Math.floor(options.offset / options.limit) + 1
            : undefined,
        limit: options.limit,
      };
    } catch (error) {
      logger.error(`Failed to find ${this.entityName}s`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        options,
      });

      return {
        data: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Update entity by ID
   * @param id - Entity ID
   * @param data - Update data
   * @returns Updated entity
   */
  public async update(
    id: string,
    data: Partial<Omit<T, "id" | "createdAt">>
  ): Promise<RepositoryResult<T>> {
    try {
      const result = await measureAsync(
        `${this.entityName}_update`,
        async () => {
          const updateData = {
            ...data,
            updatedAt: new Date(),
          } as any;

          const [updated] = await this.db
            .update(this.table)
            .set(updateData)
            .where(eq(this.idColumn, id))
            .returning();

          return updated;
        },
        { entityName: this.entityName, entityId: id }
      );

      if (!result) {
        return {
          success: false,
          error: `${this.entityName} not found`,
        };
      }

      logger.info(`${this.entityName} updated`, {
        entityId: id,
        entityName: this.entityName,
        updatedFields: Object.keys(data),
      });

      return {
        success: true,
        data: result as unknown as T,
        affectedRows: 1,
      };
    } catch (error) {
      logger.error(`Failed to update ${this.entityName}`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        entityId: id,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete entity by ID
   * @param id - Entity ID
   * @returns Operation result
   */
  public async delete(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const result = await measureAsync(
        `${this.entityName}_delete`,
        async () => {
          const deletedRows = await this.db
            .delete(this.table)
            .where(eq(this.idColumn, id));

          return deletedRows;
        },
        { entityName: this.entityName, entityId: id }
      );

      logger.info(`${this.entityName} deleted`, {
        entityId: id,
        entityName: this.entityName,
      });

      return {
        success: true,
        data: true,
        affectedRows: 1,
      };
    } catch (error) {
      logger.error(`Failed to delete ${this.entityName}`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        entityId: id,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete multiple entities
   * @param ids - Array of entity IDs
   * @returns Operation result
   */
  public async deleteMany(ids: string[]): Promise<RepositoryResult<boolean>> {
    try {
      const result = await measureAsync(
        `${this.entityName}_delete_many`,
        async () => {
          const deletedRows = await this.db
            .delete(this.table)
            .where(inArray(this.idColumn, ids));

          return deletedRows;
        },
        { entityName: this.entityName, count: ids.length }
      );

      logger.info(`${ids.length} ${this.entityName}s deleted`, {
        count: ids.length,
        entityName: this.entityName,
      });

      return {
        success: true,
        data: true,
        affectedRows: ids.length,
      };
    } catch (error) {
      logger.error(`Failed to delete ${this.entityName}s`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        count: ids.length,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if entity exists
   * @param id - Entity ID
   * @returns Whether entity exists
   */
  public async exists(id: string): Promise<boolean> {
    try {
      const [result] = await this.db
        .select({ id: this.idColumn })
        .from(this.table)
        .where(eq(this.idColumn, id))
        .limit(1);

      return !!result;
    } catch (error) {
      logger.error(`Failed to check if ${this.entityName} exists`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        entityId: id,
      });
      return false;
    }
  }

  /**
   * Count entities with optional filtering
   * @param where - Where conditions
   * @returns Entity count
   */
  public async count(where?: Record<string, any>): Promise<number> {
    try {
      let query = this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.table);

      if (where) {
        const conditions = this.buildWhereConditions(where);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }
      }

      const [{ count }] = await query;
      return count;
    } catch (error) {
      logger.error(`Failed to count ${this.entityName}s`, {
        error: error instanceof Error ? error.message : error,
        entityName: this.entityName,
        where,
      });
      return 0;
    }
  }

  /**
   * Build where conditions from filter object
   */
  protected buildWhereConditions(where: Record<string, any>): SQL[] {
    const conditions: SQL[] = [];

    for (const [key, value] of Object.entries(where)) {
      const column = (this.table as any)[key];
      if (!column) continue;

      if (value === null) {
        conditions.push(isNull(column));
      } else if (value === undefined) {
        continue;
      } else if (typeof value === "object" && value !== null) {
        // Handle operators like { $gt: 5 }, { $in: [1,2,3] }, etc.
        for (const [operator, operatorValue] of Object.entries(value)) {
          switch (operator) {
            case "$gt":
              conditions.push(sql`${column} > ${operatorValue}`);
              break;
            case "$gte":
              conditions.push(sql`${column} >= ${operatorValue}`);
              break;
            case "$lt":
              conditions.push(sql`${column} < ${operatorValue}`);
              break;
            case "$lte":
              conditions.push(sql`${column} <= ${operatorValue}`);
              break;
            case "$ne":
              conditions.push(sql`${column} != ${operatorValue}`);
              break;
            case "$in":
              if (Array.isArray(operatorValue)) {
                conditions.push(inArray(column, operatorValue));
              }
              break;
            case "$notIn":
              if (Array.isArray(operatorValue)) {
                conditions.push(sql`${column} NOT IN ${operatorValue}`);
              }
              break;
            case "$like":
              conditions.push(like(column, String(operatorValue)));
              break;
            case "$ilike":
              conditions.push(ilike(column, String(operatorValue)));
              break;
            case "$isNull":
              conditions.push(
                operatorValue ? isNull(column) : isNotNull(column)
              );
              break;
          }
        }
      } else {
        conditions.push(eq(column, value));
      }
    }

    return conditions;
  }

  /**
   * Build search conditions for text search
   */
  protected buildSearchConditions(searchTerm: string, fields: string[]): SQL[] {
    const conditions: SQL[] = [];

    for (const field of fields) {
      const column = (this.table as any)[field];
      if (column) {
        conditions.push(ilike(column, `%${searchTerm}%`));
      }
    }

    return conditions;
  }
}
