-- Add optional fields to receipts table
ALTER TABLE receipts 
ADD COLUMN payment_type VARCHAR(100) DEFAULT NULL,
ADD COLUMN card_last_4 VARCHAR(10) DEFAULT NULL,
ADD COLUMN currency_code VARCHAR(10) DEFAULT NULL,
ADD COLUMN invoice_number VARCHAR(100) DEFAULT NULL,
ADD COLUMN supplier_address TEXT DEFAULT NULL,
ADD COLUMN supplier_phone VARCHAR(50) DEFAULT NULL;

-- Create table for line items
CREATE TABLE IF NOT EXISTS receipt_line_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_id INT NOT NULL,
    description TEXT,
    qty DECIMAL(10,2) DEFAULT 1.00,
    amount DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
);
