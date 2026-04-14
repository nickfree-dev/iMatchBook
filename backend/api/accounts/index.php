<?php
// backend/api/accounts/index.php
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = auth_require();

header('Content-Type: application/json');

try {
    $db = (new Database())->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM accounts WHERE user_id = :uid AND is_active = 1 ORDER BY name ASC");
    $stmt->execute([':uid' => $user->sub]);
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $accounts]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
