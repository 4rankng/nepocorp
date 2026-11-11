UPDATE "faq_entries"
SET
  "answer" = replace("answer", 'TransTing', 'TTransport'),
  "updated_at" = now()
WHERE "answer" LIKE '%TransTing%';
