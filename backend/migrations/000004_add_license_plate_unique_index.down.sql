-- Remove index and unique constraint for license_plate in trailers table
DROP INDEX idx_trailers_license_plate ON trailers;
ALTER TABLE trailers DROP INDEX uk_trailers_license_plate;

-- Remove index and unique constraint for license_plate in tractors table
DROP INDEX idx_tractors_license_plate ON tractors;
ALTER TABLE tractors DROP INDEX uk_tractors_license_plate;