-- 0025: Add trip_expense_photos for forwarder expense receipt photos
CREATE TABLE IF NOT EXISTS trip_expense_photos (
  id SERIAL PRIMARY KEY,
  trip_expense_id INTEGER NOT NULL REFERENCES trip_expenses(id),
  storage_key VARCHAR(255) NOT NULL,
  uploaded_by INTEGER,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);
