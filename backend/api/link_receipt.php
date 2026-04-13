<?php
// backend/api/link_receipt.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../middleware/auth.php';

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

header('Content-Type: application/json');
$authUser = auth_require();

require_once '../config/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$response = ['success' => false, 'message' => ''];

if (!isset($data['transaction_id']) || !isset($data['receipt_path'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing transaction ID or receipt path.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

try {
    $query = "UPDATE bank_transactions SET receipt_path = :path WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':path', $data['receipt_path']);
    $stmt->bindParam(':id', $data['transaction_id']);

    if ($stmt->execute()) {
        $response['success'] = true;
        $response['message'] = 'Receipt linked successfully.';
    } else {
        $response['message'] = 'Failed to update transaction.';
    }

} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
}

echo json_encode($response);
