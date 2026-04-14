<?php
// backend/migrate_011_intelligent_categories.php

require_once __DIR__ . '/config/db.php';

// Set this to true ONLY if you want to wipe the table and restart IDs at 1
// After the first run, change this to false to preserve your transaction's category links!
$forceReset = true; 

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        die("Database connection failed.\n");
    }

    echo "Starting Intelligent Migration for Categories...\n";

    // 1. Update Enum if necessary
    $db->exec("ALTER TABLE categories MODIFY COLUMN type ENUM('income', 'expense', 'transfer', 'capital') DEFAULT 'expense'");
    echo "Ensured categories.type ENUM is correct.\n";

    // 2. Handle Table Reset (if requested)
    if ($forceReset) {
        echo "Forcing Table Reset (Truncating)... \n";
        $db->exec("SET FOREIGN_KEY_CHECKS = 0");
        $db->exec("TRUNCATE TABLE categories");
        $db->exec("SET FOREIGN_KEY_CHECKS = 1");
        echo "Table truncated and IDs reset to 1.\n";
    }

    // Helper function to Upsert categories
    function upsertCat($db, $name, $type, $line, $color, $parentId = null) {
        // Check if it exists by name (only for system categories, user_id is NULL)
        $stmt = $db->prepare("SELECT id FROM categories WHERE name = :name AND user_id IS NULL LIMIT 1");
        $stmt->execute([':name' => $name]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Update existing row
            $stmt = $db->prepare("UPDATE categories SET type = :type, schedule_e_line = :line, color = :color, parent_id = :pid WHERE id = :id");
            $stmt->execute([
                ':type' => $type, 
                ':line' => $line, 
                ':color' => $color, 
                ':pid' => $parentId, 
                ':id' => $existing['id']
            ]);
            // echo "Updated: $name\n";
            return $existing['id'];
        } else {
            // Insert new row
            $stmt = $db->prepare("INSERT INTO categories (name, type, schedule_e_line, color, parent_id) VALUES (:name, :type, :line, :color, :pid)");
            $stmt->execute([
                ':name' => $name, 
                ':type' => $type, 
                ':line' => $line, 
                ':color' => $color, 
                ':pid' => $parentId
            ]);
            $newId = $db->lastInsertId();
            // echo "Inserted: $name (ID: $newId)\n";
            return $newId;
        }
    }

    // --- CATEGORY DATA ---

    // 1. Income
    $idIncome = upsertCat($db, 'Income', 'income', 'Line 3 - Rents received', '#22c55e');
    $subsIncome = ['Rent', 'Security Deposit', 'Late Fee', 'Pet', 'Parking', 'Laundry'];
    foreach ($subsIncome as $s) upsertCat($db, $s, 'income', 'Line 3 - Rents received', '#22c55e', $idIncome);

    // 2. Transfers
    $idTransfers = upsertCat($db, 'Transfers', 'transfer', NULL, '#64748b');
    $subsTransfers = ['Credit Card Payment', 'Bank Transfer', 'Owner Distribution', 'Owner Contribution', "Return/Reimbursment"];
    foreach ($subsTransfers as $s) upsertCat($db, $s, 'transfer', NULL, '#64748b', $idTransfers);

    // 3. Expenses
    $expList = [
        'Advertising' => ['line' => 'Line 5 - Advertising', 'color' => '#6366f1', 'subs' => ['Listing Fees', 'Signage', 'Online Marketing', 'Tenant Screening', 'Background Check']],
        'Auto and Travel' => ['line' => 'Line 6 - Auto and travel', 'color' => '#8b5cf6', 'subs' => ['Mileage', 'Parking & Tolls', 'Travel Costs']],
        'Cleaning and Maintenance' => ['line' => 'Line 7 - Cleaning and maintenance', 'color' => '#ec4899', 'subs' => ['Cleaning', 'Landscaping', 'Pest Control']],
        'Commissions' => ['line' => 'Line 8 - Commissions', 'color' => '#f43f5e', 'subs' => ['Leasing Fees', 'Referral Fees']],
        'Insurance' => ['line' => 'Line 9 - Insurance', 'color' => '#f97316', 'subs' => ['Property Insurance', 'Liability', 'Umbrella']],
        'Legal and Professional' => ['line' => 'Line 10 - Legal and other professional fees', 'color' => '#eab308', 'subs' => ['Tax Preparation', 'Legal/Eviction Fees', 'Accounting', 'Inspection', 'Appraisal']],
        'Management Fees' => ['line' => 'Line 11 - Management fees', 'color' => '#d946ef', 'subs' => ['Property Management', 'Software Subscriptions', 'Service Calls']],
        'Mortgage Interest' => ['line' => 'Line 12 - Mortgage interest paid to banks, etc.', 'color' => '#06b6d4', 'subs' => ['Bank Mortgage Interest']],
        'Other Interest' => ['line' => 'Line 13 - Other interest', 'color' => '#0891b2', 'subs' => ['Credit Card Interest', 'Private Loan Interest']],
        'Repairs' => ['line' => 'Line 14 - Repairs', 'color' => '#ef4444', 'subs' => ['Plumbing', 'Electrical', 'HVAC Repair', 'Handyman Services', 'Painting', 'Carpentry']],
        'Supplies' => ['line' => 'Line 15 - Supplies', 'color' => '#fbbf24', 'subs' => ['Maintenance Supplies', 'Office Supplies', 'Smoke & CO Detectors']],
        'Taxes' => ['line' => 'Line 16 - Taxes', 'color' => '#4b5563', 'subs' => ['Property Taxes', 'Rental Permits & Licenses']],
        'Utilities' => ['line' => 'Line 17 - Utilities', 'color' => '#3b82f6', 'subs' => ['Electric', 'Gas', 'Water & Sewer', 'Trash']],
        'Other Expenses' => ['line' => 'Line 19 - Other (list)', 'color' => '#64748b', 'subs' => ['HOA Dues', 'Bank Fees']]
    ];

    foreach ($expList as $main => $details) {
        $pid = upsertCat($db, $main, 'expense', $details['line'], $details['color']);
        foreach ($details['subs'] as $s) {
            upsertCat($db, $s, 'expense', $details['line'], $details['color'], $pid);
        }
    }

    // 4. Capital Improvements
    $idCapital = upsertCat($db, 'Capital Improvements', 'capital', 'Line 18 - Depreciation expense or depletion', '#a855f7');
    $subsCapital = ['Major Renovations', 'New Appliances', 'New Roof', 'Structural Improvements'];
    foreach ($subsCapital as $s) upsertCat($db, $s, 'capital', 'Line 18 - Depreciation expense or depletion', '#a855f7', $idCapital);

    echo "Migration completed successfully.\n";
    echo "Total categories updated/inserted.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
