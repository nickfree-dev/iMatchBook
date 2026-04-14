<?php
// backend/api/reports/dashboard.php
// Returns dashboard KPI data: totals, monthly cashflow, recent transactions, unmatched counts
//
// GET ?property_id=&year=

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user   = auth_require();
$userId = $user->sub;

header('Content-Type: application/json');

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$propertyId = !empty($_GET['property_id']) ? (int)$_GET['property_id'] : null;
$year       = !empty($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

$propFilter    = '';
$propParams    = [':user_id' => $userId, ':year' => $year];

if ($propertyId) {
    $propFilter = ' AND t.property_id = :prop_id';
    $propParams[':prop_id'] = $propertyId;
}

// --- 1. KPI Totals (for the selected year) ---
$kpiSql = "SELECT 
    COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(t.amount), 0) AS net,
    COUNT(*) AS total_transactions
FROM bank_transactions t
WHERE t.user_id = :user_id AND YEAR(t.transaction_date) = :year $propFilter";

$kpiStmt = $db->prepare($kpiSql);
foreach ($propParams as $k => $v) $kpiStmt->bindValue($k, $v);
$kpiStmt->execute();
$kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC);

// --- 2. Monthly Cash Flow (12 months for bar chart) ---
$monthlySql = "SELECT 
    MONTH(t.transaction_date) AS month,
    COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS expenses
FROM bank_transactions t
WHERE t.user_id = :user_id AND YEAR(t.transaction_date) = :year $propFilter
GROUP BY MONTH(t.transaction_date)
ORDER BY MONTH(t.transaction_date)";

$monthStmt = $db->prepare($monthlySql);
foreach ($propParams as $k => $v) $monthStmt->bindValue($k, $v);
$monthStmt->execute();
$monthlyRaw = $monthStmt->fetchAll(PDO::FETCH_ASSOC);

// Fill all 12 months
$months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
$monthly = [];
$monthMap = [];
foreach ($monthlyRaw as $m) {
    $monthMap[(int)$m['month']] = $m;
}
for ($i = 1; $i <= 12; $i++) {
    $monthly[] = [
        'month'    => $months[$i - 1],
        'income'   => (float)($monthMap[$i]['income'] ?? 0),
        'expenses' => (float)($monthMap[$i]['expenses'] ?? 0),
        'net'      => (float)(($monthMap[$i]['income'] ?? 0) - ($monthMap[$i]['expenses'] ?? 0)),
    ];
}

// --- 3. Recent Transactions (last 10) ---
$recentSql = "SELECT t.id, t.transaction_date, t.description, t.amount, 
    t.receipt_id, p.name AS property_name, c.name AS category_name, c.color AS category_color
FROM bank_transactions t
LEFT JOIN properties p ON t.property_id = p.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = :user_id $propFilter
ORDER BY t.transaction_date DESC, t.id DESC
LIMIT 10";

$recentParams = [':user_id' => $userId];
if ($propertyId) $recentParams[':prop_id'] = $propertyId;

$recentStmt = $db->prepare($recentSql);
foreach ($recentParams as $k => $v) $recentStmt->bindValue($k, $v);
$recentStmt->execute();
$recent = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

// --- 4. Unmatched Counts ---
// Transactions without a receipt
$unmatchedTxSql = "SELECT COUNT(*) FROM bank_transactions WHERE user_id = :uid AND receipt_id IS NULL";
$unmatchedTxStmt = $db->prepare($unmatchedTxSql);
$unmatchedTxStmt->execute([':uid' => $userId]);
$unmatchedTransactions = (int)$unmatchedTxStmt->fetchColumn();

// Receipts without a linked transaction
$unmatchedDocSql = "SELECT COUNT(*) FROM receipts r 
    WHERE r.user_id = :uid 
    AND NOT EXISTS (SELECT 1 FROM bank_transactions bt WHERE bt.receipt_id = r.id)";
$unmatchedDocStmt = $db->prepare($unmatchedDocSql);
$unmatchedDocStmt->execute([':uid' => $userId]);
$unmatchedDocuments = (int)$unmatchedDocStmt->fetchColumn();

// --- 5. Category Breakdown (for donut chart) ---
$catSql = "SELECT c.name, c.color, c.type,
    COALESCE(SUM(ABS(t.amount)), 0) AS total
FROM bank_transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = :user_id AND YEAR(t.transaction_date) = :year $propFilter
GROUP BY c.id, c.name, c.color, c.type
ORDER BY total DESC";

$catStmt = $db->prepare($catSql);
foreach ($propParams as $k => $v) $catStmt->bindValue($k, $v);
$catStmt->execute();
$categoryBreakdown = $catStmt->fetchAll(PDO::FETCH_ASSOC);

// --- 6. Per-Property Summary ---
$propSumSql = "SELECT p.id, p.name, p.type,
    COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS expenses,
    COALESCE(SUM(t.amount), 0) AS net,
    COUNT(t.id) AS tx_count
FROM properties p
LEFT JOIN bank_transactions t ON t.property_id = p.id AND t.user_id = :user_id AND YEAR(t.transaction_date) = :year
WHERE p.user_id = :user_id2 AND p.is_active = 1
GROUP BY p.id, p.name, p.type
ORDER BY net DESC";

$propSumStmt = $db->prepare($propSumSql);
$propSumStmt->bindValue(':user_id', $userId);
$propSumStmt->bindValue(':user_id2', $userId);
$propSumStmt->bindValue(':year', $year);
$propSumStmt->execute();
$propertySummary = $propSumStmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'data'    => [
        'year'                   => $year,
        'kpi'                    => [
            'total_income'       => (float)$kpi['total_income'],
            'total_expenses'     => (float)$kpi['total_expenses'],
            'net'                => (float)$kpi['net'],
            'total_transactions' => (int)$kpi['total_transactions'],
        ],
        'monthly'                => $monthly,
        'recent_transactions'    => $recent,
        'unmatched_transactions' => $unmatchedTransactions,
        'unmatched_documents'    => $unmatchedDocuments,
        'category_breakdown'     => $categoryBreakdown,
        'property_summary'       => $propertySummary,
    ],
]);
?>
