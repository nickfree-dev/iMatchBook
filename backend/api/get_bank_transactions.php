<?php
// backend/api/get_bank_transactions.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../middleware/auth.php';

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

header('Content-Type: application/json');
$authUser = auth_require();

require_once '../config/db.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

try {
    $query = "SELECT * FROM bank_transactions ORDER BY transaction_date DESC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $transactions
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
