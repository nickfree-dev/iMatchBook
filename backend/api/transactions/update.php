<?php
// backend/api/transactions/update.php
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/Transaction.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = auth_require();
$userId = $user->sub;

$database = new Database();
$db = $database->getConnection();
$transactionModel = new Transaction($db);

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use PATCH or POST for updates.']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Transaction ID is required']);
    exit;
}

if ($transactionModel->update($id, $userId, $data)) {
    echo json_encode(['success' => true, 'message' => 'Transaction updated successfully']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update transaction']);
}
?>
