<?php
// backend/migrate_009_categories_v3.php

require_once __DIR__ . '/config/db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        die("Database connection failed.\n");
    }

    echo "Starting Migration 009 (Final Categories Refinement)...\n";

    // 1. Update Enum if necessary (MySQL ENUM requires full re-definition)
    // We'll use 'capital' as a new type
    $db->exec("ALTER TABLE categories MODIFY COLUMN type ENUM('income', 'expense', 'transfer', 'capital') DEFAULT 'expense'");
    echo "Updated categories.type ENUM.\n";

    // 2. Wipe existing system categories to avoid mess
    $db->exec("DELETE FROM categories WHERE user_id IS NULL");
    echo "Cleared old system categories.\n";

    // Helper function to insert hierarchy
    function insertCat($db, $name, $type, $line, $color, $parentId = null) {
        $stmt = $db->prepare("INSERT INTO categories (name, type, schedule_e_line, color, parent_id) VALUES (:name, :type, :line, :color, :pid)");
        $stmt->execute([':name' => $name, ':type' => $type, ':line' => $line, ':color' => $color, ':pid' => $parentId]);
        return $db->lastInsertId();
    }

    // --- GROUP 1: Income ---
    $idIncome = insertCat($db, 'Income', 'income', 'Line 3 - Rents received', '#22c55e');
    $subsIncome = ['Rent', 'Security Deposit', 'Late Fee', 'Pet', 'Parking', 'Laundry'];
    foreach ($subsIncome as $s) insertCat($db, $s, 'income', 'Line 3 - Rents received', '#22c55e', $idIncome);



    // --- GROUP 1: Transfers ---
    $idTransfers = insertCat($db, 'Transfers', 'transfer', NULL, '#64748b');
    $subsTransfers = ['Credit Card Payment', 'Bank Transfer', 'Owner Distribution', 'Owner Contribution', "Return/Reimbursment"];
    foreach ($subsTransfers as $s) insertCat($db, $s, 'transfer', NULL, '#64748b', $idTransfers);

    // --- GROUP 2: Expenses ---
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
        $pid = insertCat($db, $main, 'expense', $details['line'], $details['color']);
        foreach ($details['subs'] as $s) {
            insertCat($db, $s, 'expense', $details['line'], $details['color'], $pid);
        }
    }

    // --- GROUP 3: Capital Improvements ---
    $idCapital = insertCat($db, 'Capital Improvements', 'capital', 'Line 18 - Depreciation expense or depletion', '#a855f7');
    $subsCapital = ['Major Renovations', 'New Appliances', 'New Roof', 'Structural Improvements'];
    foreach ($subsCapital as $s) insertCat($db, $s, 'capital', 'Line 18 - Depreciation expense or depletion', '#a855f7', $idCapital);

    echo "Hierarchical categories (v3) successfully created.\n";
    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
