-- iMatchBook Full Schema Implementation (v2.0)
-- Includes Users, Properties, Categories, Receipts, and Bank Transactions.

-- 1. Users table (Phase 1)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    refresh_token TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Properties table (Phase 2)
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    type ENUM('sfr', 'multi', 'commercial', 'other') DEFAULT 'sfr',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Categories table (Phase 2)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') DEFAULT 'expense',
    schedule_e_line VARCHAR(100),
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Receipts table (Phase 1 & 2 Combined)
CREATE TABLE IF NOT EXISTS receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    property_id INT NULL,
    category_id INT NULL,
    image_path VARCHAR(255) NOT NULL,
    file_hash CHAR(32) NULL,
    merchant_name VARCHAR(255) DEFAULT NULL,
    receipt_date DATE DEFAULT NULL,
    total_amount DECIMAL(10, 2) DEFAULT NULL,
    payment_type VARCHAR(100) DEFAULT NULL,
    card_last_4 VARCHAR(10) DEFAULT NULL,
    currency_code VARCHAR(10) DEFAULT NULL,
    invoice_number VARCHAR(100) DEFAULT NULL,
    supplier_address TEXT DEFAULT NULL,
    supplier_phone VARCHAR(50) DEFAULT NULL,
    doc_type ENUM('receipt', 'invoice', 'contract', 'statement', 'other') DEFAULT 'receipt',
    notes TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 5. Receipt Line Items table
CREATE TABLE IF NOT EXISTS receipt_line_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_id INT NOT NULL,
    description TEXT,
    qty DECIMAL(10,2) DEFAULT 1.00,
    amount DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
);

-- 6. Bank Transactions table (Phase 1 & 2 Combined)
CREATE TABLE IF NOT EXISTS bank_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    property_id INT NULL,
    category_id INT NULL,
    receipt_id INT NULL,
    transaction_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    receipt_path VARCHAR(255) NULL,
    notes TEXT,
    source ENUM('csv', 'qif', 'ofx', 'manual') DEFAULT 'csv',
    is_reviewed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE SET NULL
);

-- SEEDING Default Categories (System-wide)
INSERT IGNORE INTO categories (name, type, schedule_e_line, color) VALUES 
('Rents Received', 'income', 'Line 3 - Rents received', '#22c55e'),
('Advertising', 'expense', 'Line 5 - Advertising', '#6366f1'),
('Auto and Travel', 'expense', 'Line 6 - Auto and travel', '#8b5cf6'),
('Cleaning and Maintenance', 'expense', 'Line 7 - Cleaning and maintenance', '#ec4899'),
('Commissions', 'expense', 'Line 8 - Commissions', '#f43f5e'),
('Insurance', 'expense', 'Line 9 - Insurance', '#f97316'),
('Legal and Professional Fees', 'expense', 'Line 10 - Legal and other professional fees', '#eab308'),
('Management Fees', 'expense', 'Line 11 - Management fees', '#d946ef'),
('Mortgage Interest', 'expense', 'Line 12 - Mortgage interest paid to banks, etc.', '#06b6d4'),
('Other Interest', 'expense', 'Line 13 - Other interest', '#0891b2'),
('Repairs', 'expense', 'Line 14 - Repairs', '#ef4444'),
('Supplies', 'expense', 'Line 15 - Supplies', '#fbbf24'),
('Taxes', 'expense', 'Line 16 - Taxes', '#4b5563'),
('Utilities', 'expense', 'Line 17 - Utilities', '#3b82f6'),
('Depreciation expense or depletion', 'expense', 'Line 18 - Depreciation expense or depletion', '#94a3b8'),
('Other Expenses', 'expense', 'Line 19 - Other (list)', '#64748b');
