<?php
// backend/api/transactions/bulk_update.php
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
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use PATCH or POST for bulk updates.']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$ids = $data['ids'] ?? [];
$updateData = $data['data'] ?? null;

if (empty($ids) || !is_array($ids)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'An array of Transaction IDs is required']);
    exit;
}

if (!$updateData || !is_array($updateData)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Update data is required']);
    exit;
}

if ($transactionModel->bulkUpdate($ids, $userId, $updateData)) {
    echo json_encode([
        'success' => true, 
        'message' => 'Successfully updated ' . count($ids) . ' transactions.'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to perform bulk update']);
}
?>
