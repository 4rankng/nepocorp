/**
 * PATCH-safe partial schema builder (Zod v4).
 *
 * Zod v4 applies `.default()` INSIDE `.partial()` (v3 skipped it), so
 * `schema.partial().parse({})` on a create-schema with defaults now returns
 * every defaulted field instead of `{}` — a bare PATCH would overwrite stored
 * columns with create-time defaults (e.g. `sellAmount` → 0,
 * `settlementMethod` → 'FORWARDER_ADVANCE', `isActive` → true).
 *
 * The default wins over the optional wrapper in EVERY ordering:
 * `.default(x).nullable()`, `.nullable().default(x)`, `.default(x).optional()`
 * and `.optional().default(x)` all leak on an omitted key, so the strip has to
 * look through ZodOptional/ZodNullable wrappers — not just the outermost
 * ZodDefault chain.
 *
 * `partialUpdateSchema` makes every field optional AND strips any ZodDefault
 * reachable through the wrapper chain: an absent field parses to `undefined`
 * ("leave unchanged") while an explicit value is still validated against the
 * field schema without its default. Wire every PATCH endpoint that reuses a
 * create schema through this helper instead of `.partial()`. Unknown keys are
 * stripped, matching a plain `z.object` create schema.
 */
import { z, type ZodObject, type ZodOptional, type ZodRawShape, type ZodType } from 'zod';

/** Strip the ZodDefault layer of one field, recursing through ZodOptional /
 *  ZodNullable wrappers and rebuilding them around the stripped schema.
 *  Returns null when the field carries no default anywhere in its chain. */
function withoutDefault(field: ZodType): ZodType | null {
  if (field instanceof z.ZodDefault) {
    let inner = field.removeDefault() as ZodType;
    while (inner instanceof z.ZodDefault) inner = inner.removeDefault() as ZodType;
    return inner;
  }
  if (field instanceof z.ZodOptional) {
    // v4's unwrap() widens to the core $ZodType interface; narrow it back.
    const inner = withoutDefault(field.unwrap() as ZodType);
    return inner ? z.optional(inner) : null;
  }
  if (field instanceof z.ZodNullable) {
    const inner = withoutDefault(field.unwrap() as ZodType);
    return inner ? z.nullable(inner) : null;
  }
  return null;
}

export function partialUpdateSchema<TShape extends ZodRawShape>(
  schema: ZodObject<TShape>,
): ZodObject<{ [K in keyof TShape]: ZodOptional<TShape[K]> }> {
  const stripped: Record<string, ZodType> = {};
  // v4 types `shape` values as the core `$ZodType`; the runtime values are the
  // classic classes, so the entry cast is sound.
  for (const [key, field] of Object.entries(schema.shape) as unknown as [string, ZodType][]) {
    stripped[key] = (withoutDefault(field) ?? field).optional();
  }
  // Type-generic: the mapped shape preserves per-key inference for callers.
  return z.object(stripped) as unknown as ZodObject<{
    [K in keyof TShape]: ZodOptional<TShape[K]>;
  }>;
}
