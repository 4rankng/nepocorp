/**
 * PATCH-safe partial schema helper (Zod v4).
 *
 * Zod v4 applies `.default()` INSIDE `.partial()` (v3 skipped it), so
 * `schema.partial().parse({})` on a create-schema with defaults now returns
 * every defaulted field instead of `{}` — a bare PATCH would overwrite stored
 * columns with create-time defaults (e.g. `sellAmount` → 0,
 * `settlementMethod` → 'FORWARDER_ADVANCE', `isActive` → true).
 *
 * `partialUpdateSchema` makes every field optional AND strips any ZodDefault
 * wrapper: an absent field parses to `undefined` ("leave unchanged") while an
 * explicit value is still validated against the field schema without its
 * default. Wire every PATCH endpoint that reuses a create schema through this
 * helper instead of `.partial()`.
 */
import { z, type ZodObject, type ZodOptional, type ZodRawShape, type ZodType } from 'zod';

export function partialUpdateSchema<TShape extends ZodRawShape>(
  schema: ZodObject<TShape>,
): ZodObject<{ [K in keyof TShape]: ZodOptional<TShape[K]> }> {
  const stripped: Record<string, ZodType> = {};
  // v4 types `shape` values as the core `$ZodType`; the runtime values are the
  // classic classes, so the entry cast is sound.
  for (const [key, field] of Object.entries(schema.shape) as unknown as [string, ZodType][]) {
    let inner: ZodType = field;
    while (inner instanceof z.ZodDefault) inner = inner.removeDefault() as ZodType;
    stripped[key] = inner.optional();
  }
  // Type-generic: the mapped shape preserves per-key inference for callers.
  return z.object(stripped) as unknown as ZodObject<{
    [K in keyof TShape]: ZodOptional<TShape[K]>;
  }>;
}
