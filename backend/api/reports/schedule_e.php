<?php
// backend/api/reports/schedule_e.php
// IRS Schedule E Summary grouped by property
// Maps category.schedule_e_line to line items
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

// Get all active properties
$propSql = "SELECT id, name, address, type FROM properties WHERE user_id = :uid AND is_active = 1 ORDER BY name";
$propStmt = $db->prepare($propSql);
$propStmt->execute([':uid' => $userId]);
$properties = $propStmt->fetchAll(PDO::FETCH_ASSOC);

if ($propertyId) {
    $properties = array_filter($properties, fn($p) => (int)$p['id'] === $propertyId);
    $properties = array_values($properties);
}

// Schedule E line definitions (IRS Form 1040 Schedule E, Part I)
$scheduleELines = [
    3  => 'Rents received',
    5  => 'Advertising',
    6  => 'Auto and travel',
    7  => 'Cleaning and maintenance',
    8  => 'Commissions',
    9  => 'Insurance',
    10 => 'Legal and other professional fees',
    11 => 'Management fees',
    12 => 'Mortgage interest paid to banks, etc.',
    13 => 'Other interest',
    14 => 'Repairs',
    15 => 'Supplies',
    16 => 'Taxes',
    17 => 'Utilities',
    18 => 'Depreciation expense or depletion',
    19 => 'Other (list)',
];

$result = [];

foreach ($properties as $prop) {
    $pid = $prop['id'];

    // Get totals by schedule_e_line for this property & year
    $lineSql = "SELECT 
        COALESCE(c.schedule_e_line, parent.schedule_e_line) AS schedule_e_line,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS income_total,
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS expense_total
    FROM bank_transactions t
    JOIN categories c ON t.category_id = c.id
    LEFT JOIN categories parent ON c.parent_id = parent.id
    WHERE t.user_id = :uid 
      AND t.property_id = :pid
      AND YEAR(t.transaction_date) = :year
      AND COALESCE(c.schedule_e_line, parent.schedule_e_line) IS NOT NULL
      AND COALESCE(c.schedule_e_line, parent.schedule_e_line) != ''
      AND c.type != 'transfer'
    GROUP BY COALESCE(c.schedule_e_line, parent.schedule_e_line)";

    $lineStmt = $db->prepare($lineSql);
    $lineStmt->execute([':uid' => $userId, ':pid' => $pid, ':year' => $year]);
    $lineRows = $lineStmt->fetchAll(PDO::FETCH_ASSOC);

    // Map to line numbers
    $lineMap = [];
    foreach ($lineRows as $lr) {
        $lineMap[$lr['schedule_e_line']] = [
            'income'  => (float)$lr['income_total'],
            'expense' => (float)$lr['expense_total'],
        ];
    }

    // Build lines array
    $lines = [];
    $totalExpenses = 0;
    $totalIncome = 0;

    foreach ($scheduleELines as $lineNum => $desc) {
        $matchKey = "Line $lineNum";
        $matched = null;

        // Try to find a matching schedule_e_line string
        foreach ($lineMap as $key => $vals) {
            if (strpos($key, $matchKey) !== false) {
                $matched = $vals;
                break;
            }
        }

        $amount = 0;
        if ($lineNum === 3) {
            // Income line
            $amount = $matched ? $matched['income'] : 0;
            $totalIncome += $amount;
        } else {
            // Expense lines
            $amount = $matched ? $matched['expense'] : 0;
            $totalExpenses += $amount;
        }

        $lines[] = [
            'line_number'  => $lineNum,
            'description'  => $desc,
            'amount'       => $amount,
        ];
    }

    $result[] = [
        'property'       => $prop,
        'lines'          => $lines,
        'total_income'   => $totalIncome,
        'total_expenses' => $totalExpenses,
        'net'            => $totalIncome - $totalExpenses,
    ];
}

echo json_encode([
    'success' => true,
    'data' => [
        'year'       => $year,
        'properties' => $result,
    ],
]);
?>
