<?php
// backend/api/get_bank_transactions.php
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

$filters = [
    'property_id' => $_GET['property_id'] ?? null,
    'category_id' => $_GET['category_id'] ?? null,
    'is_reviewed' => isset($_GET['is_reviewed']) ? (int)$_GET['is_reviewed'] : null,
    'date_from'   => $_GET['date_from'] ?? null,
    'date_to'     => $_GET['date_to'] ?? null,
];

$transactions = $transactionModel->getAll($userId, $filters);

echo json_encode([
    'success' => true,
    'data' => $transactions
]);
?>

