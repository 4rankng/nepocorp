-- Add unique constraint and index for license_plate in tractors table
ALTER TABLE tractors ADD CONSTRAINT uk_tractors_license_plate UNIQUE (license_plate(255));
CREATE INDEX idx_tractors_license_plate ON tractors (license_plate(255));

-- Add unique constraint and index for license_plate in trailers table
ALTER TABLE trailers ADD CONSTRAINT uk_trailers_license_plate UNIQUE (license_plate(255));
CREATE INDEX idx_trailers_license_plate ON trailers (license_plate(255));