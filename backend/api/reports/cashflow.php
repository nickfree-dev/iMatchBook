<?php
// backend/api/reports/cashflow.php
// Monthly net cash flow per property
//
// GET ?year=&property_id=

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

$year       = !empty($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
$propertyId = !empty($_GET['property_id']) ? (int)$_GET['property_id'] : null;

// Get properties
$propSql = "SELECT id, name, type FROM properties WHERE user_id = :uid AND is_active = 1 ORDER BY name";
$propStmt = $db->prepare($propSql);
$propStmt->execute([':uid' => $userId]);
$properties = $propStmt->fetchAll(PDO::FETCH_ASSOC);

if ($propertyId) {
    $properties = array_filter($properties, fn($p) => (int)$p['id'] === $propertyId);
    $properties = array_values($properties);
}

$months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

$result = [];
foreach ($properties as $prop) {
    $pid = $prop['id'];

    $sql = "SELECT 
        MONTH(t.transaction_date) AS month,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS expenses,
        COALESCE(SUM(t.amount), 0) AS net
    FROM bank_transactions t
    WHERE t.user_id = :uid AND t.property_id = :pid AND YEAR(t.transaction_date) = :year
    GROUP BY MONTH(t.transaction_date)
    ORDER BY MONTH(t.transaction_date)";

    $stmt = $db->prepare($sql);
    $stmt->execute([':uid' => $userId, ':pid' => $pid, ':year' => $year]);
    $rawMonths = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $monthMap = [];
    foreach ($rawMonths as $m) {
        $monthMap[(int)$m['month']] = $m;
    }

    $monthlyData = [];
    $ytdIncome = 0;
    $ytdExpenses = 0;

    for ($i = 1; $i <= 12; $i++) {
        $inc = (float)($monthMap[$i]['income'] ?? 0);
        $exp = (float)($monthMap[$i]['expenses'] ?? 0);
        $net = (float)($monthMap[$i]['net'] ?? 0);
        $ytdIncome += $inc;
        $ytdExpenses += $exp;

        $monthlyData[] = [
            'month'    => $months[$i - 1],
            'income'   => $inc,
            'expenses' => $exp,
            'net'      => $net,
        ];
    }

    $result[] = [
        'property'     => $prop,
        'monthly'      => $monthlyData,
        'ytd_income'   => $ytdIncome,
        'ytd_expenses' => $ytdExpenses,
        'ytd_net'      => $ytdIncome - $ytdExpenses,
    ];
}

// Also include an "All Properties" aggregate
$allSql = "SELECT 
    MONTH(t.transaction_date) AS month,
    COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS expenses,
    COALESCE(SUM(t.amount), 0) AS net
FROM bank_transactions t
WHERE t.user_id = :uid AND YEAR(t.transaction_date) = :year
GROUP BY MONTH(t.transaction_date)
ORDER BY MONTH(t.transaction_date)";

$allStmt = $db->prepare($allSql);
$allStmt->execute([':uid' => $userId, ':year' => $year]);
$allRaw = $allStmt->fetchAll(PDO::FETCH_ASSOC);

$allMap = [];
foreach ($allRaw as $m) $allMap[(int)$m['month']] = $m;

$allMonthly = [];
$allYtdIncome = 0;
$allYtdExpenses = 0;
for ($i = 1; $i <= 12; $i++) {
    $inc = (float)($allMap[$i]['income'] ?? 0);
    $exp = (float)($allMap[$i]['expenses'] ?? 0);
    $allYtdIncome += $inc;
    $allYtdExpenses += $exp;
    $allMonthly[] = [
        'month'    => $months[$i - 1],
        'income'   => $inc,
        'expenses' => $exp,
        'net'      => $inc - $exp,
    ];
}

echo json_encode([
    'success' => true,
    'data' => [
        'year'       => $year,
        'all' => [
            'monthly'      => $allMonthly,
            'ytd_income'   => $allYtdIncome,
            'ytd_expenses' => $allYtdExpenses,
            'ytd_net'      => $allYtdIncome - $allYtdExpenses,
        ],
        'properties' => $result,
    ],
]);
?>
