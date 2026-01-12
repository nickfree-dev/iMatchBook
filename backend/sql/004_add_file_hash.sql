ALTER TABLE receipts ADD COLUMN file_hash CHAR(32) NULL AFTER image_path;
CREATE INDEX idx_file_hash ON receipts(file_hash);
