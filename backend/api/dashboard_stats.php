<?php
// backend/api/dashboard_stats.php
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../models/Transaction.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = auth_require();
$userId = $user->sub;

$database = new Database();
$db = $database->getConnection();
$transactionModel = new Transaction($db);

$property_id = $_GET['property_id'] ?? null;

// Get all transactions for this user (and property if filtered)
$filters = ['property_id' => $property_id];
$transactions = $transactionModel->getAll($userId, $filters);

$stats = [
    'income' => 0,
    'expense' => 0,
    'capital' => 0,
    'net' => 0,
    'monthly' => []
];

$monthlyData = [];

foreach ($transactions as $t) {
    $amount = (float)$t['amount'];
    $type = $t['category_type'];
    // We also need to check the sign if type is null (unassigned)
    // Professional rule: Positive = Income (unless transfer), Negative = Expense (unless transfer)
    
    $isTransfer = ($type === 'transfer');
    if ($isTransfer) continue; // Skip transfers in P&L stats

    $monthKey = substr($t['transaction_date'], 0, 7); // YYYY-MM
    if (!isset($monthlyData[$monthKey])) {
        $monthlyData[$monthKey] = ['month' => $monthKey, 'income' => 0, 'expense' => 0, 'capital' => 0];
    }

    if ($type === 'capital') {
        $stats['capital'] += abs($amount);
        $monthlyData[$monthKey]['capital'] += abs($amount);
    } else {
        // Evaluate as Income or Expense
        // If type is explicitly 'income' or 'expense', use that.
        // If null, infer from sign.
        if ($type === 'income' || ($amount > 0 && !$type)) {
            $stats['income'] += $amount;
            $monthlyData[$monthKey]['income'] += $amount;
        } else if ($type === 'expense' || ($amount < 0 && !$type)) {
            $stats['expense'] += abs($amount);
            $monthlyData[$monthKey]['expense'] += abs($amount);
        }
    }
}

$stats['net'] = $stats['income'] - $stats['expense'];

ksort($monthlyData);
$stats['monthly'] = array_values($monthlyData);

echo json_encode([
    'success' => true,
    'data' => $stats
]);
