<?php
// backend/migrate.php
require_once __DIR__ . '/config/db.php';

echo "Starting migration...\n";

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

$sqlFile = __DIR__ . '/sql/002_create_bank_transactions.sql';

if (!file_exists($sqlFile)) {
    die("SQL file not found at $sqlFile\n");
}

$sql = file_get_contents($sqlFile);

try {
    $db->exec($sql);
    echo "Migration applied successfully.\n";
} catch (PDOException $e) {
    echo "Error applying migration: " . $e->getMessage() . "\n";
}
?>
