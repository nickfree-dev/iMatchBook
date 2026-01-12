<?php
// backend/migrate_003.php
require_once __DIR__ . '/config/db.php';

echo "Applying migration 003...\n";

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

$sqlFile = __DIR__ . '/sql/003_add_receipt_path.sql';

if (!file_exists($sqlFile)) {
    die("SQL file not found at $sqlFile\n");
}

$sql = file_get_contents($sqlFile);

try {
    $db->exec($sql);
    echo "Migration 003 applied successfully.\n";
} catch (PDOException $e) {
    // Check if duplicate column error (1060)
    if (strpos($e->getMessage(), "Duplicate column") !== false) {
        echo "Column already exists, skipping.\n";
    } else {
        echo "Error applying migration: " . $e->getMessage() . "\n";
    }
}
?>
