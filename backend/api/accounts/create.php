<?php
// backend/api/accounts/create.php
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = auth_require();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$name = trim($data['name'] ?? '');
$type = trim($data['type'] ?? 'checking');
$last_4 = trim($data['last_4'] ?? '');

if (!$name) {
    echo json_encode(['success' => false, 'error' => 'Account name is required']);
    exit;
}

try {
    $db = (new Database())->getConnection();
    
    $stmt = $db->prepare("INSERT INTO accounts (user_id, name, type, last_4) VALUES (:uid, :name, :type, :last_4)");
    $stmt->execute([
        ':uid' => $user->sub,
        ':name' => $name,
        ':type' => $type,
        ':last_4' => $last_4 ?: null
    ]);
    
    $id = $db->lastInsertId();
    
    echo json_encode([
        'success' => true, 
        'data' => [
            'id' => $id, 
            'name' => $name, 
            'type' => $type, 
            'last_4' => $last_4 ?: null
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
