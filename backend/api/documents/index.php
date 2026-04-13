<?php
// backend/api/documents/index.php
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/Document.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = auth_require();
$userId = $user->sub;

$database = new Database();
$db = $database->getConnection();
$documentModel = new Document($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $filters = [
            'property_id' => $_GET['property_id'] ?? null,
            'matched'     => $_GET['matched'] ?? null, // 'yes' | 'no'
        ];

        // Get documents with extra join to linked transaction
        $sql = "SELECT r.*, 
                       p.name as property_name, 
                       c.name as category_name,
                       bt.id as linked_tx_id,
                       bt.description as linked_tx_description,
                       bt.amount as linked_tx_amount,
                       bt.transaction_date as linked_tx_date
                FROM receipts r
                LEFT JOIN properties p ON r.property_id = p.id
                LEFT JOIN categories c ON r.category_id = c.id
                LEFT JOIN bank_transactions bt ON bt.receipt_id = r.id AND bt.user_id = r.user_id
                WHERE r.user_id = :user_id";

        $params = [':user_id' => $userId];

        if (!empty($filters['property_id'])) {
            $sql .= " AND r.property_id = :property_id";
            $params[':property_id'] = $filters['property_id'];
        }

        if ($filters['matched'] === 'yes') {
            $sql .= " AND bt.id IS NOT NULL";
        } elseif ($filters['matched'] === 'no') {
            $sql .= " AND bt.id IS NULL";
        }

        $sql .= " ORDER BY r.upload_date DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $documents, 'count' => count($documents)]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Document ID is required']);
            break;
        }
        if ($documentModel->delete($id, $userId)) {
            echo json_encode(['success' => true, 'message' => 'Document deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to delete document']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>
