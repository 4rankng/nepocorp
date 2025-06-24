-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) NOT NULL UNIQUE,
    `value` TEXT NOT NULL,
    last_updated_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`),
    CONSTRAINT fk_settings_last_updated_by FOREIGN KEY (last_updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add last_updated_by column to tractor_expenses table
ALTER TABLE tractor_expenses 
ADD COLUMN last_updated_by BIGINT UNSIGNED,
ADD CONSTRAINT fk_tractor_expenses_last_updated_by FOREIGN KEY (last_updated_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Insert default tax_rate setting (using user ID 1, assuming admin user exists)
INSERT INTO settings (`key`, `value`, last_updated_by) VALUES ('tax_rate', '10', 1);