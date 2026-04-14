<?php
// backend/api/reports/pl.php
// Profit & Loss report: Income vs Expenses by category for a date range + property filter
//
// GET ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&property_id=

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

$dateFrom   = $_GET['date_from'] ?? date('Y-01-01');
$dateTo     = $_GET['date_to']   ?? date('Y-12-31');
$propertyId = !empty($_GET['property_id']) ? (int)$_GET['property_id'] : null;

$propFilter = '';
$params = [':user_id' => $userId, ':date_from' => $dateFrom, ':date_to' => $dateTo];

if ($propertyId) {
    $propFilter = ' AND t.property_id = :prop_id';
    $params[':prop_id'] = $propertyId;
}

// --- Income rows by category ---
$incomeSql = "SELECT 
    COALESCE(parent.name, c.name, 'Uncategorized') AS main_category,
    CASE WHEN parent.id IS NOT NULL THEN c.name ELSE NULL END AS sub_category,
    COALESCE(parent.name, c.name, 'Uncategorized') AS category,
    COALESCE(parent.color, c.color) AS color,
    COALESCE(parent.schedule_e_line, c.schedule_e_line) AS schedule_e_line,
    COALESCE(SUM(t.amount), 0) AS total
FROM bank_transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN categories parent ON c.parent_id = parent.id
WHERE t.user_id = :user_id 
  AND t.transaction_date BETWEEN :date_from AND :date_to
  AND t.amount > 0
  AND (c.type != 'transfer' OR c.type IS NULL)
  $propFilter
GROUP BY c.id, c.name, parent.id, parent.name, c.color, parent.color, c.schedule_e_line, parent.schedule_e_line
ORDER BY main_category ASC, total DESC";

$incomeStmt = $db->prepare($incomeSql);
foreach ($params as $k => $v) $incomeStmt->bindValue($k, $v);
$incomeStmt->execute();
$incomeRows = $incomeStmt->fetchAll(PDO::FETCH_ASSOC);

// --- Expense rows by category ---
$expenseSql = "SELECT 
    COALESCE(parent.name, c.name, 'Uncategorized') AS main_category,
    CASE WHEN parent.id IS NOT NULL THEN c.name ELSE NULL END AS sub_category,
    COALESCE(parent.name, c.name, 'Uncategorized') AS category,
    COALESCE(parent.color, c.color) AS color,
    COALESCE(parent.schedule_e_line, c.schedule_e_line) AS schedule_e_line,
    COALESCE(SUM(ABS(t.amount)), 0) AS total
FROM bank_transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN categories parent ON c.parent_id = parent.id
WHERE t.user_id = :user_id 
  AND t.transaction_date BETWEEN :date_from AND :date_to
  AND t.amount < 0
  AND (c.type != 'transfer' OR c.type IS NULL)
  $propFilter
GROUP BY c.id, c.name, parent.id, parent.name, c.color, parent.color, c.schedule_e_line, parent.schedule_e_line
ORDER BY main_category ASC, total DESC";

$expenseStmt = $db->prepare($expenseSql);
foreach ($params as $k => $v) $expenseStmt->bindValue($k, $v);
$expenseStmt->execute();
$expenseRows = $expenseStmt->fetchAll(PDO::FETCH_ASSOC);

// --- Totals ---
$totalsSql = "SELECT 
    COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(t.amount), 0) AS net
FROM bank_transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = :user_id 
  AND t.transaction_date BETWEEN :date_from AND :date_to
  AND (c.type != 'transfer' OR c.type IS NULL)
  $propFilter";

$totalsStmt = $db->prepare($totalsSql);
foreach ($params as $k => $v) $totalsStmt->bindValue($k, $v);
$totalsStmt->execute();
$totals = $totalsStmt->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'data' => [
        'date_from'      => $dateFrom,
        'date_to'        => $dateTo,
        'income_rows'    => $incomeRows,
        'expense_rows'   => $expenseRows,
        'total_income'   => (float)$totals['total_income'],
        'total_expenses' => (float)$totals['total_expenses'],
        'net'            => (float)$totals['net'],
    ],
]);
?>
