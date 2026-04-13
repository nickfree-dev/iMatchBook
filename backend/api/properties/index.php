<?php
// backend/api/properties/index.php
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/Property.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = auth_require();
$userId = $user->sub;

$database = new Database();
$db = $database->getConnection();
$propertyModel = new Property($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $properties = $propertyModel->getAll($userId);
        echo json_encode(['success' => true, 'data' => $properties]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Property name is required']);
            break;
        }
        $id = $propertyModel->create($userId, $data);
        if ($id) {
            echo json_encode(['success' => true, 'id' => $id, 'message' => 'Property created']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create property']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Property ID is required']);
            break;
        }
        if ($propertyModel->update($data['id'], $userId, $data)) {
            echo json_encode(['success' => true, 'message' => 'Property updated']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update property']);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Property ID is required']);
            break;
        }
        if ($propertyModel->delete($id, $userId)) {
            echo json_encode(['success' => true, 'message' => 'Property deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to delete property']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>
