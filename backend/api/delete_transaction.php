<?php
// backend/api/delete_transaction.php
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

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

try {
    if (isset($data['action']) && $data['action'] === 'clear_all') {
        $query = "TRUNCATE TABLE bank_transactions";
        $stmt = $db->prepare($query);
        if ($stmt->execute()) {
            $response['success'] = true;
            $response['message'] = 'All transactions cleared.';
        } else {
            $response['message'] = 'Failed to clear transactions.';
        }
    } elseif (isset($data['id'])) {
        $query = "DELETE FROM bank_transactions WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data['id']);
        if ($stmt->execute()) {
            $response['success'] = true;
            $response['message'] = 'Transaction deleted.';
        } else {
            $response['message'] = 'Failed to delete transaction.';
        }
    } else {
        $response['message'] = 'Invalid request.';
    }

} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
}

echo json_encode($response);
