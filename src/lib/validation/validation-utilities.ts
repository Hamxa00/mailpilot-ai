/**
 * @fileoverview Validation utilities for MailPilot AI
 * @description Utility functions for schema validation, middleware, and error handling
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ValidationError } from "../errors";
import { logger } from "../logging";

/**
 * Validation result type
 */
type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: z.ZodError;
    };

/**
 * Validate data against a Zod schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result
 */
export const validateSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
};

/**
 * Validate data against a schema and throw ValidationError if invalid
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Additional context for error
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export const validateOrThrow = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: { requestId?: string; userId?: string }
): T => {
  const result = validateSchema(schema, data);

  if (!result.success) {
    const validationErrors = result.error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    throw new ValidationError("VALIDATION_INVALID_INPUT", {
      message: "Input validation failed",
      validationErrors,
      context: {
        ...context,
        zodErrors: result.error.issues,
      },
      requestId: context?.requestId,
      userId: context?.userId,
    });
  }

  return result.data;
};

/**
 * Create validation middleware for API routes
 * @param options - Validation options
 * @returns Middleware function
 */
export const withValidation = (options: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return async (
    request: NextRequest,
    handler: (
      request: NextRequest,
      validatedData: {
        body?: any;
        query?: any;
        params?: any;
      }
    ) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const validatedData: { body?: any; query?: any; params?: any } = {};
    const context = {
      requestId: (request as any).context?.requestId,
      userId: (request as any).user?.id,
    };

    try {
      // Validate request body
      if (options.body) {
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const body = await request.json().catch(() => null);
          validatedData.body = validateOrThrow(options.body, body, context);
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const formData = await request.formData();
          const body = Object.fromEntries(formData.entries());
          validatedData.body = validateOrThrow(options.body, body, context);
        }
      }

      // Validate query parameters
      if (options.query) {
        const url = new URL(request.url);
        const query = Object.fromEntries(url.searchParams.entries());
        validatedData.query = validateOrThrow(options.query, query, context);
      }

      // Validate route parameters (would need to be passed in somehow)
      if (options.params) {
        // This would typically be extracted from the Next.js context
        // For now, we'll skip this part as it requires more integration
      }

      return await handler(request, validatedData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      // Handle other errors
      throw new ValidationError("VALIDATION_INVALID_INPUT", {
        message: "Validation failed",
        cause: error as Error,
        context,
      });
    }
  };
};

/**
 * Validate environment variables
 * @param envSchema - Schema for environment validation
 * @returns Validated environment variables
 */
export const validateEnvironment = <T>(envSchema: z.ZodSchema<T>): T => {
  try {
    return validateOrThrow(envSchema, process.env);
  } catch (error) {
    logger.error("Environment validation failed", {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
};

/**
 * Transform and validate data with custom preprocessing
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param preprocessors - Custom preprocessing functions
 * @returns Validated and transformed data
 */
export const validateWithPreprocessing = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  preprocessors?: {
    [key: string]: (value: any) => any;
  }
): T => {
  let processedData = data;

  if (preprocessors && typeof data === "object" && data !== null) {
    processedData = { ...data };

    for (const [key, processor] of Object.entries(preprocessors)) {
      if (key in (processedData as Record<string, any>)) {
        (processedData as Record<string, any>)[key] = processor(
          (processedData as Record<string, any>)[key]
        );
      }
    }
  }

  return validateOrThrow(schema, processedData);
};

/**
 * Create a schema for partial updates (all fields optional)
 * @param baseSchema - Base schema to make partial
 * @returns Partial schema
 */
export const createPartialSchema = <T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> => {
  return baseSchema.partial();
};

/**
 * Merge multiple schemas into one
 * @param schemas - Array of schemas to merge
 * @returns Merged schema
 */
export const mergeSchemas = <T extends z.ZodRawShape[]>(
  ...schemas: { [K in keyof T]: z.ZodObject<T[K]> }
): z.ZodObject<T[number]> => {
  return schemas.reduce((acc, schema) => acc.merge(schema)) as any;
};

/**
 * Create a discriminated union schema
 * @param discriminator - Field to discriminate on
 * @param options - Schema options for each discriminator value
 * @returns Discriminated union schema
 */
export const createDiscriminatedSchema = <
  D extends string,
  T extends Record<string, z.ZodRawShape>
>(
  discriminator: D,
  options: T
) => {
  const schemas = Object.entries(options).map(([key, shape]) =>
    z.object({ [discriminator]: z.literal(key), ...shape } as any)
  );

  return z.discriminatedUnion(discriminator, schemas as any);
};

/**
 * Sanitize and validate user input
 * @param schema - Validation schema
 * @param data - Input data to sanitize and validate
 * @param options - Sanitization options
 * @returns Sanitized and validated data
 */
export const sanitizeAndValidate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options: {
    trimStrings?: boolean;
    removeEmpty?: boolean;
    maxStringLength?: number;
  } = {}
): T => {
  const { trimStrings = true, removeEmpty = false, maxStringLength } = options;

  const sanitizeValue = (value: any): any => {
    if (typeof value === "string") {
      let sanitized = value;

      if (trimStrings) {
        sanitized = sanitized.trim();
      }

      if (maxStringLength && sanitized.length > maxStringLength) {
        sanitized = sanitized.substring(0, maxStringLength);
      }

      return sanitized;
    }

    if (Array.isArray(value)) {
      const sanitizedArray = value.map(sanitizeValue);
      return removeEmpty
        ? sanitizedArray.filter((v) => v != null && v !== "")
        : sanitizedArray;
    }

    if (typeof value === "object" && value !== null) {
      const sanitizedObj: Record<string, any> = {};

      for (const [key, val] of Object.entries(value)) {
        const sanitizedVal = sanitizeValue(val);

        if (!removeEmpty || (sanitizedVal != null && sanitizedVal !== "")) {
          sanitizedObj[key] = sanitizedVal;
        }
      }

      return sanitizedObj;
    }

    return value;
  };

  const sanitizedData = sanitizeValue(data);
  return validateOrThrow(schema, sanitizedData);
};

/**
 * Create a conditional schema based on another field's value
 * @param conditionField - Field to check condition on
 * @param conditions - Mapping of field values to schemas
 * @param defaultSchema - Default schema if condition doesn't match
 * @returns Conditional schema
 */
export const createConditionalSchema = <T>(
  conditionField: string,
  conditions: Record<string, z.ZodSchema<T>>,
  defaultSchema?: z.ZodSchema<T>
): z.ZodSchema<T> => {
  return z.any().superRefine((data, ctx) => {
    const conditionValue = data?.[conditionField];
    const schema = conditions[conditionValue] || defaultSchema;

    if (!schema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `No schema defined for ${conditionField} value: ${conditionValue}`,
      });
      return;
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          code: issue.code,
          path: issue.path,
          message: issue.message,
          ...(issue as any), // Cast to avoid type issues
        });
      });
    }
  }) as z.ZodSchema<T>;
};

/**
 * Format validation errors for client response
 * @param error - Zod validation error
 * @returns Formatted error object
 */
export const formatValidationErrors = (error: z.ZodError) => {
  return error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code,
    received: "received" in err ? err.received : undefined,
    expected: "expected" in err ? err.expected : undefined,
  }));
};
