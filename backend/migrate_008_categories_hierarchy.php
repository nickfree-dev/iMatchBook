<?php
// backend/migrate_008_categories_hierarchy.php

require_once __DIR__ . '/config/db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        die("Database connection failed.\n");
    }

    echo "Starting Migration 008 (Categories Hierarchy)...\n";

    // 1. Add parent_id to categories
    $stmt = $db->query("SHOW COLUMNS FROM categories LIKE 'parent_id'");
    if ($stmt->rowCount() == 0) {
        $sql1 = "ALTER TABLE categories ADD COLUMN parent_id INT NULL";
        $db->exec($sql1);
        
        $sql2 = "ALTER TABLE categories ADD CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL";
        $db->exec($sql2);
        echo "Added parent_id to categories.\n";
    } else {
        echo "Column parent_id already exists.\n";
    }

    // 2. Adjust System Default Categories for Hierarchy
    
    // Rename 'Rents Received' to 'Income'
    $db->exec("UPDATE categories SET name = 'Income' WHERE name = 'Rents Received' AND user_id IS NULL");
    
    $mapper = [
        'Income' => [
            ['name' => 'Rents', 'type' => 'income'],
            ['name' => 'Fees', 'type' => 'income'],
            ['name' => 'Security Deposits', 'type' => 'income']
        ],
        'Utilities' => [
            ['name' => 'Garbage & Recycling', 'type' => 'expense'],
            ['name' => 'Water & Sewer', 'type' => 'expense'],
            ['name' => 'Electric', 'type' => 'expense'],
            ['name' => 'Gas', 'type' => 'expense']
        ],
        'Cleaning and Maintenance' => [
            ['name' => 'Cleaning', 'type' => 'expense'],
            ['name' => 'Maintenance', 'type' => 'expense'],
            ['name' => 'Lawn Care', 'type' => 'expense']
        ],
        'Repairs' => [
            ['name' => 'Plumbing', 'type' => 'expense'],
            ['name' => 'Electrical', 'type' => 'expense'],
            ['name' => 'HVAC', 'type' => 'expense']
        ]
    ];

    foreach ($mapper as $mainName => $subs) {
        // Find the main category ID
        $s = $db->prepare("SELECT id, color FROM categories WHERE name = :name AND user_id IS NULL LIMIT 1");
        $s->execute([':name' => $mainName]);
        $mainCat = $s->fetch(PDO::FETCH_ASSOC);

        if ($mainCat) {
            $mainId = $mainCat['id'];
            $mainColor = $mainCat['color'];

            foreach ($subs as $sub) {
                // Check if sub exists under this parent
                $cs = $db->prepare("SELECT id FROM categories WHERE name = :name AND parent_id = :pid AND user_id IS NULL");
                $cs->execute([':name' => $sub['name'], ':pid' => $mainId]);
                if ($cs->rowCount() == 0) {
                    $ins = $db->prepare("INSERT INTO categories (name, type, color, parent_id, schedule_e_line) VALUES (:name, :type, :color, :pid, NULL)");
                    $ins->execute([
                        ':name'  => $sub['name'],
                        ':type'  => $sub['type'],
                        ':color' => $mainColor, // inherit color
                        ':pid'   => $mainId
                    ]);
                }
            }
        }
    }

    // Transfers parent mapping logic
    // Create 'Transfers Main' if it doesn't exist
    $trStmt = $db->query("SELECT id FROM categories WHERE name = 'Transfers' AND type = 'transfer' AND user_id IS NULL");
    if ($trStmt->rowCount() == 0) {
        $db->exec("INSERT INTO categories (name, type, color) VALUES ('Transfers', 'transfer', '#64748b')");
        $transferMainId = $db->lastInsertId();
    } else {
        $transferMainId = $trStmt->fetchColumn();
    }

    // Re-parent the existing transfer types
    $transferSubs = ['Credit Card Payment', 'Owner Distribution', 'Owner Contribution', 'Security Deposit Movement'];
    foreach ($transferSubs as $ts) {
        $upd = $db->prepare("UPDATE categories SET parent_id = :pid WHERE name = :name AND type = 'transfer' AND user_id IS NULL");
        $upd->execute([':pid' => $transferMainId, ':name' => $ts]);
    }

    echo "Hierarchical seed data successfully created.\n";
    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
