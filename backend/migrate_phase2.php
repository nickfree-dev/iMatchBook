<?php
// backend/migrate_phase2.php
// Run this to apply Phase 2 database changes.
// Usage: php backend/migrate_phase2.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config/db.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Database connection failed.\n");
}

echo "✅ Connected to database.\n";

/**
 * Helper to add a column safely if it doesn't exist
 */
function addColumnSafely($db, $table, $column, $definition) {
    try {
        $db->exec("ALTER TABLE $table ADD COLUMN $column $definition");
        echo "✅ Column '$column' added to '$table'.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "ℹ️  Column '$column' already exists in '$table' — skipped.\n";
        } else {
            echo "⚠️  Error adding '$column' to '$table': " . $e->getMessage() . "\n";
        }
    }
}

// --- 1. Run the base schema SQL ---
echo "--- Step 1: Creating new tables and seeding categories ---\n";
$sql = file_get_contents(__DIR__ . '/sql/phase2_schema.sql');
try {
    $db->exec($sql);
    echo "✅ Tables created and categories seeded.\n";
} catch (PDOException $e) {
    echo "⚠️  Note during schema creation: " . $e->getMessage() . "\n";
}

// --- 2. Update bank_transactions schema ---
echo "--- Step 2: Updating bank_transactions schema ---\n";
addColumnSafely($db, 'bank_transactions', 'user_id', 'INT NULL');
addColumnSafely($db, 'bank_transactions', 'property_id', 'INT NULL');
addColumnSafely($db, 'bank_transactions', 'category_id', 'INT NULL');
addColumnSafely($db, 'bank_transactions', 'receipt_id', 'INT NULL');
addColumnSafely($db, 'bank_transactions', 'notes', 'TEXT NULL');
addColumnSafely($db, 'bank_transactions', 'source', "ENUM('csv','qif','ofx','manual') DEFAULT 'csv'");
addColumnSafely($db, 'bank_transactions', 'is_reviewed', 'TINYINT(1) DEFAULT 0');

// Add foreign keys if possible (simplified here, in real app might need more check)
try {
    $db->exec("ALTER TABLE bank_transactions ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
    $db->exec("ALTER TABLE bank_transactions ADD FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL");
    $db->exec("ALTER TABLE bank_transactions ADD FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL");
} catch (PDOException $e) {
    echo "ℹ️  Foreign keys might already exist or failed: " . $e->getMessage() . "\n";
}

// --- 3. Update receipts schema ---
echo "--- Step 3: Updating receipts schema ---\n";
addColumnSafely($db, 'receipts', 'user_id', 'INT NULL');
addColumnSafely($db, 'receipts', 'property_id', 'INT NULL');
addColumnSafely($db, 'receipts', 'category_id', 'INT NULL');
addColumnSafely($db, 'receipts', 'doc_type', "ENUM('receipt','invoice','contract','statement','other') DEFAULT 'receipt'");
addColumnSafely($db, 'receipts', 'notes', 'TEXT NULL');

try {
    $db->exec("ALTER TABLE receipts ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
    $db->exec("ALTER TABLE receipts ADD FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL");
    $db->exec("ALTER TABLE receipts ADD FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL");
} catch (PDOException $e) {
    echo "ℹ️  Foreign keys might already exist or failed: " . $e->getMessage() . "\n";
}

// --- 4. Seed default properties for the first admin ---
echo "--- Step 4: Seeding default properties ---\n";
$userCheck = $db->query('SELECT id FROM users LIMIT 1');
$admin = $userCheck->fetch(PDO::FETCH_ASSOC);

if ($admin) {
    $userId = $admin['id'];
    $propCheck = $db->prepare('SELECT id FROM properties WHERE user_id = :uid');
    $propCheck->execute([':uid' => $userId]);

    if ($propCheck->rowCount() === 0) {
        $props = [
            ['name' => '123 Main St', 'address' => '123 Main St, Springfield, IL', 'type' => 'sfr'],
            ['name' => '456 Oak Ave', 'address' => '456 Oak Avenue, Unit B, Aurora, CO', 'type' => 'multi'],
            ['name' => 'General Portfolio', 'address' => 'N/A', 'type' => 'other']
        ];

        $ins = $db->prepare('INSERT INTO properties (user_id, name, address, type) VALUES (:uid, :name, :addr, :type)');
        foreach ($props as $p) {
            $ins->execute([
                ':uid' => $userId,
                ':name' => $p['name'],
                ':addr' => $p['address'],
                ':type' => $p['type']
            ]);
        }
        echo "✅ Default properties seeded for User ID: $userId.\n";
    } else {
        echo "ℹ️  Properties already exist for admin — skipped seeding.\n";
    }
} else {
    echo "⚠️  No user found, skipped property seeding.\n";
}

// --- 5. Fix existing data: Assign all current transactions/receipts to the first user if user_id is null ---
if ($admin) {
    $userId = $admin['id'];
    $db->exec("UPDATE bank_transactions SET user_id = $userId WHERE user_id IS NULL");
    $db->exec("UPDATE receipts SET user_id = $userId WHERE user_id IS NULL");
    echo "✅ Assigned existing data to User ID: $userId.\n";
}

echo "\n🚀 Migration Phase 2 complete.\n";
?>
