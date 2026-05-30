import type { Response, Request, NextFunction } from 'express';

/**
 * camelCase → snake_case key converter for response payloads.
 * Walks the response body recursively and renames camelCase keys
 * to snake_case. Skips arrays (iterates items), nulls, and primitives.
 *
 * This replaces the dual-layer approach:
 *   - Backend: transformTripRow() manual per-field mapping
 *   - Frontend: addSnakeCaseAliases() runtime mutation
 *
 * Now the backend serializes once at the seam, and the frontend
 * consumes snake_case directly with no transformation.
 */
function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function convertKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(convertKeys);
  if (typeof value === 'object' && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const snakeKey = /[a-z][A-Z]/.test(key) ? toSnakeCase(key) : key;
      result[snakeKey] = convertKeys(val);
    }
    return result;
  }
  // Date, Buffer, RegExp, class instances — return as-is
  return value;
}

/**
 * Express middleware that intercepts res.json() and converts
 * all camelCase keys in the response to snake_case.
 */
export function snakeCaseSerializer(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    return originalJson.call(this, convertKeys(body));
  };
  next();
}
