<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'config/db.php';

echo "Running Migration 005: Add Extended Receipt Fields...\n";

$database = new Database();
$db = $database->getConnection();

if ($db) {
    try {
        $sql = file_get_contents('sql/005_add_extended_receipt_fields.sql');
        $db->exec($sql);
        echo "Migration successful!\n";
    } catch (PDOException $e) {
        echo "Migration failed: " . $e->getMessage() . "\n";
    }
} else {
    echo "Database connection failed.\n";
}
?>
