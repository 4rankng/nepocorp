-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tractor_id BIGINT UNSIGNED NULL,
    trailer_id BIGINT UNSIGNED NULL,
    vendor_name VARCHAR(255) NOT NULL,
    expense_category_id BIGINT UNSIGNED NOT NULL,
    subtotal BIGINT NOT NULL,
    tax_rate INT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    payment_proof VARCHAR(500),
    currency VARCHAR(50) NOT NULL DEFAULT 'VND',
    remark TEXT,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tractor_id) REFERENCES tractors(id) ON DELETE CASCADE,
    FOREIGN KEY (trailer_id) REFERENCES trailers(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_tractor_id (tractor_id),
    INDEX idx_trailer_id (trailer_id),
    INDEX idx_expense_category_id (expense_category_id),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expense_items table
CREATE TABLE IF NOT EXISTS expense_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_id BIGINT UNSIGNED NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total BIGINT NOT NULL,
    install_date DATETIME DEFAULT NULL,
    expiry_date DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    INDEX idx_expense_id (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;