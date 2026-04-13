-- Phase 2 Schema: Properties, Categories, and Enhanced Transactions/Receipts

-- 1. Create Properties Table
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

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL, -- NULL means it's a system-wide default category
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') DEFAULT 'expense',
    schedule_e_line VARCHAR(100),
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update bank_transactions table
-- We use a migration script to handle column additions safely if they already exist, 
-- but here's the logical schema update.
-- user_id (FK), property_id (FK), category_id (FK), receipt_id (FK), notes (TEXT), source (ENUM), is_reviewed (BOOL)

-- 4. Update receipts table
-- user_id (FK), property_id (FK), category_id (FK), doc_type (ENUM), notes (TEXT)

-- --- SEEDING ---

-- Seed Default Categories (System-wide)
INSERT INTO categories (name, type, schedule_e_line, color) VALUES 
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

-- Seed Default Properties for the first user (assume ID 1 exists from migrate_006)
-- This will be handled in the PHP script to ensure we get the right user ID.
