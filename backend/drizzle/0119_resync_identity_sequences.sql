-- Resync identity (serial) sequences that drifted behind their table's max id.
--
-- Symptom: inserting a row failed with 23505 on the primary key
-- (`Key (id)=(N) already exists` → surfaced as "id đã tồn tại") even though the
-- user-entered data was unique. Root cause: sequences get out of sync with the
-- rows in their table when rows are created with explicit ids (seeds, restores,
-- data migrations) — the sequence keeps returning ids that already exist.
--
-- Advance-only: a sequence that is already ahead of max(id) is left alone, so
-- this never reuses ids of hard-deleted rows and is safe to run on a live DB.
DO $$
DECLARE
  r RECORD;
  max_id bigint;
  seq_val bigint;
BEGIN
  FOR r IN
    SELECT
      c.table_name,
      c.column_name,
      pg_get_serial_sequence(c.table_name, c.column_name) AS seq
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_default LIKE 'nextval(%'
  LOOP
    CONTINUE WHEN r.seq IS NULL;
    EXECUTE format('SELECT coalesce(max(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_id;
    EXECUTE format('SELECT last_value FROM %s', r.seq) INTO seq_val;
    IF max_id > seq_val THEN
      PERFORM setval(r.seq, max_id);
    END IF;
  END LOOP;
END $$;
