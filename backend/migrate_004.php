<?php
// backend/migrate_004.php
require_once __DIR__ . '/config/db.php';

echo "Applying migration 004...\n";

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.\n");
}

$sqlFile = __DIR__ . '/sql/004_add_file_hash.sql';

if (!file_exists($sqlFile)) {
    die("SQL file not found at $sqlFile\n");
}

$sql = file_get_contents($sqlFile);

try {
    // Might fail if multiple statements are not supported by simple exec in some configs, 
    // but usually PDO exec handles it or we split.
    // Splitting by ; just in case
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $stmt) {
        if (!empty($stmt)) {
             try {
                $db->exec($stmt);
                echo "Executed: " . substr($stmt, 0, 50) . "...\n";
             } catch (PDOException $e) {
                if (strpos($e->getMessage(), "Duplicate column") !== false) {
                    echo "Column or index already exists, skipping.\n";
                } else {
                    echo "Error: " . $e->getMessage() . "\n";
                }
             }
        }
    }
    echo "Migration 004 applied.\n";
} catch (Exception $e) {
    echo "General Error: " . $e->getMessage() . "\n";
}
?>
