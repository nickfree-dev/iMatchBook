<?php
// backend/migrate_007_transfers.php

require_once __DIR__ . '/config/db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        die("Database connection failed.\n");
    }

    echo "Starting Migration 007 (Transfers)...\n";

    // 1. Alter categories table to include 'transfer' enum
    $sql1 = "ALTER TABLE categories MODIFY COLUMN type ENUM('income', 'expense', 'transfer') DEFAULT 'expense'";
    $db->exec($sql1);
    echo "Added 'transfer' to categories type ENUM.\n";

    // 2. Insert preset transfer categories
    $sql2 = "INSERT IGNORE INTO categories (name, type, color, schedule_e_line) VALUES 
        ('Credit Card Payment', 'transfer', '#64748b', NULL),
        ('Owner Distribution', 'transfer', '#64748b', NULL),
        ('Owner Contribution', 'transfer', '#64748b', NULL),
        ('Security Deposit Movement', 'transfer', '#64748b', NULL)";
    $db->exec($sql2);
    echo "Inserted default Transfer categories.\n";

    // 3. Add linked_transaction_id to bank_transactions
    // Check if column exists first to be safe
    $stmt = $db->query("SHOW COLUMNS FROM bank_transactions LIKE 'linked_transaction_id'");
    if ($stmt->rowCount() == 0) {
        $sql3 = "ALTER TABLE bank_transactions ADD COLUMN linked_transaction_id INT NULL";
        $db->exec($sql3);
        
        $sql4 = "ALTER TABLE bank_transactions ADD CONSTRAINT fk_linked_txn FOREIGN KEY (linked_transaction_id) REFERENCES bank_transactions(id) ON DELETE SET NULL";
        $db->exec($sql4);
        echo "Added linked_transaction_id to bank_transactions.\n";
    } else {
        echo "Column linked_transaction_id already exists.\n";
    }

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
