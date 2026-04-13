<?php
// backend/migrate_006.php
// Run this to create the users table and seed a default admin user.
// Usage: docker exec -it imatchbook-backend php /var/www/html/backend/migrate_006.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config/db.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Database connection failed.\n");
}

echo "✅ Connected to database.\n";

// --- Run migration SQL ---
$sql = file_get_contents(__DIR__ . '/sql/006_create_users_table.sql');
try {
    $db->exec($sql);
    echo "✅ Users table created (or already exists).\n";
} catch (PDOException $e) {
    die("❌ Migration failed: " . $e->getMessage() . "\n");
}

// --- Run migration 007 ---
$sql2 = file_get_contents(__DIR__ . '/sql/007_add_receipt_path_to_transactions.sql');
try {
    $db->exec($sql2);
    echo "✅ Migration 007 applied (receipt_path column).\n";
} catch (PDOException $e) {
    // MySQL < 8.0 doesn't support ADD COLUMN IF NOT EXISTS — catch and ignore the duplicate column error
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "ℹ️  receipt_path column already exists — skipped.\n";
    } else {
        echo "⚠️  Migration 007 note: " . $e->getMessage() . "\n";
    }
}

// --- Seed default admin user ---
$defaultEmail    = 'admin@imatchbook.local';
$defaultPassword = 'changeme123';
$defaultName     = 'Admin';

$check = $db->prepare('SELECT id FROM users WHERE email = :email');
$check->execute([':email' => $defaultEmail]);

if ($check->rowCount() === 0) {
    $hash = password_hash($defaultPassword, PASSWORD_BCRYPT);
    $ins  = $db->prepare('INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :hash)');
    $ins->execute([':name' => $defaultName, ':email' => $defaultEmail, ':hash' => $hash]);
    echo "✅ Default admin user created.\n";
    echo "   📧 Email   : $defaultEmail\n";
    echo "   🔑 Password: $defaultPassword\n";
    echo "   ⚠️  Change this password in production!\n";
} else {
    echo "ℹ️  Admin user already exists — skipped.\n";
}

echo "\n✅ Migration 006 complete.\n";
