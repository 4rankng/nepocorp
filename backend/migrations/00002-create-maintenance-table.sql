-- +migrate Up
CREATE TABLE IF NOT EXISTS `maintenance` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `expense_id` BIGINT UNSIGNED NOT NULL,
    `license_plate` VARCHAR(255) NOT NULL,
    `vendor_name` VARCHAR(255) NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `price` BIGINT NOT NULL,
    `quantity` INT NOT NULL,
    `tax_rate` FLOAT NOT NULL DEFAULT 0,
    `total` BIGINT NOT NULL,
    `install_date` DATETIME NULL,
    `expiry_date` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX (`expense_id`),
    INDEX (`license_plate`),
    INDEX (`vendor_name`),
    INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +migrate Down
DROP TABLE IF EXISTS `maintenance`;