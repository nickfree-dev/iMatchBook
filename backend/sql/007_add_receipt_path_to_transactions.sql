-- Migration 007: Add receipt_path column to bank_transactions (used by link_receipt.php)
-- Only adds the column if it does not already exist.
ALTER TABLE bank_transactions
    ADD COLUMN receipt_path VARCHAR(255) DEFAULT NULL;
