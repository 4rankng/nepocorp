import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { faqEntryUpdateSchema, partialUpdateSchema, tripExpensePatchSchema } from './index';

/** Regression pins for the zod v4 default-in-.partial() change: a partial
 *  update must never ride create-time defaults into a DB write. v4 applies
 *  ZodDefault on an omitted key through EVERY wrapper ordering, so the strip
 *  has to see through ZodOptional/ZodNullable as well. */
test('partialUpdateSchema keeps omitted keys out of the parsed update across wrapper orderings', () => {
  const schema = z.object({
    plain: z.string().min(1),
    defaulted: z.coerce.number().int().default(7),
    // default OUTSIDE the optional wrapper
    optionalDefault: z.string().optional().default('fall'),
    // default INSIDE the optional wrapper
    defaultOptional: z.string().default('rise').optional(),
    // default INSIDE the nullable wrapper — v4 still applies it on undefined
    nullableDefault: z.string().default('D').nullable(),
    // default OUTSIDE the nullable wrapper
    defaultNullable: z.string().nullable().default(null),
  });

  const update = partialUpdateSchema(schema);
  assert.deepEqual(update.parse({}), {});
  assert.deepEqual(update.parse({ defaulted: '5' }), { defaulted: 5 });
  assert.deepEqual(update.parse({ optionalDefault: 'x' }), { optionalDefault: 'x' });
  assert.deepEqual(update.parse({ defaultOptional: 'y' }), { defaultOptional: 'y' });
  assert.deepEqual(update.parse({ nullableDefault: null }), { nullableDefault: null });
  assert.deepEqual(update.parse({ defaultNullable: 'z' }), { defaultNullable: 'z' });
  // Explicit values still validate against the field schema without its
  // default (coercion kept, garbage rejected).
  assert.equal(update.safeParse({ defaulted: 'abc' }).success, false);
  assert.equal(update.safeParse({ plain: '' }).success, false);
});

test('partialUpdateSchema strips unknown keys like the plain create object', () => {
  const update = partialUpdateSchema(z.object({ name: z.string() }));
  const parsed = update.safeParse({ name: 'x', rogue: 1 });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.ok(!('rogue' in parsed.data));
});

/** The two composed patch schemas on money/config paths: a bare PATCH that
 *  omits `sellAmount`/`settlementMethod`/`isActive` must leave the stored
 *  columns alone instead of resetting them to create-time defaults. */
test('tripExpensePatchSchema keeps money fields out of a buyAmount-only PATCH', () => {
  assert.deepEqual(tripExpensePatchSchema.parse({ buyAmount: 1000 }), { buyAmount: 1000 });
  const explicit = tripExpensePatchSchema.parse({
    buyAmount: 1000,
    sellAmount: 500,
    settlementMethod: 'COMPANY_DIRECT',
  });
  assert.equal(explicit.sellAmount, 500);
  assert.equal(explicit.settlementMethod, 'COMPANY_DIRECT');
});

test('faqEntryUpdateSchema keeps flags and ordering out of a question-only PATCH', () => {
  assert.deepEqual(faqEntryUpdateSchema.parse({ question: 'Q?' }), { question: 'Q?' });
  assert.deepEqual(faqEntryUpdateSchema.parse({ isActive: false }), { isActive: false });
});
