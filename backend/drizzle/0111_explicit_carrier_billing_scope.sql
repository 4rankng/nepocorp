UPDATE "billing_documents" AS "document"
SET
  "entity_type" = 'CARRIER',
  "updated_at" = now()
WHERE
  "document"."type" = 'PAYMENT_STATEMENT'
  AND "document"."entity_type" = 'CUSTOMER'
  AND EXISTS (
    SELECT 1
    FROM "billing_document_lines" AS "line"
    INNER JOIN "trips" AS "trip"
      ON "trip"."id" = "line"."source_id"
    WHERE
      "line"."document_id" = "document"."id"
      AND "line"."source_type" = 'TRIP'
      AND "trip"."external_carrier_id" = "document"."entity_id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "billing_document_lines" AS "line"
    LEFT JOIN "trips" AS "trip"
      ON "trip"."id" = "line"."source_id"
    WHERE
      "line"."document_id" = "document"."id"
      AND "line"."source_type" = 'TRIP'
      AND (
        "trip"."id" IS NULL
        OR "trip"."external_carrier_id" IS DISTINCT FROM "document"."entity_id"
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "billing_document_lines" AS "line"
    INNER JOIN "trips" AS "trip"
      ON "trip"."id" = "line"."source_id"
    WHERE
      "line"."document_id" = "document"."id"
      AND "line"."source_type" = 'TRIP'
      AND "trip"."customer_id" = "document"."entity_id"
  );
