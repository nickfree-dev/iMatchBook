<?php
// backend/migrate_010_add_accounts.php

require_once __DIR__ . '/config/db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        die("Database connection failed.\n");
    }

    echo "Starting Migration 010 (Adding Accounts)...\n";

    // 1. Create accounts table
    $sqlAccounts = "
    CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        type ENUM('checking', 'savings', 'credit', 'cash', 'other') DEFAULT 'checking',
        last_4 VARCHAR(4) NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $db->exec($sqlAccounts);
    echo "Created table 'accounts'.\n";

    // 2. Add account_id to bank_transactions
    // Check if column exists first
    $checkCol = $db->query("SHOW COLUMNS FROM bank_transactions LIKE 'account_id'");
    if ($checkCol->rowCount() == 0) {
        $db->exec("ALTER TABLE bank_transactions ADD COLUMN account_id INT NULL AFTER property_id");
        $db->exec("ALTER TABLE bank_transactions ADD CONSTRAINT fk_bt_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL");
        echo "Added 'account_id' to bank_transactions.\n";
    } else {
        echo "'account_id' already exists in bank_transactions.\n";
    }

    echo "Migration 010 completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
