<?php
// backend/api/categories/index.php
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/Category.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user = auth_require();
$userId = $user->sub;

$database = new Database();
$db = $database->getConnection();
$categoryModel = new Category($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $categories = $categoryModel->getAll($userId);
        echo json_encode(['success' => true, 'data' => $categories]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Category name is required']);
            break;
        }
        $id = $categoryModel->create($userId, $data);
        if ($id) {
            echo json_encode(['success' => true, 'id' => $id, 'message' => 'Category created']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create category']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['id']) || empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Category ID and name are required']);
            break;
        }
        if ($categoryModel->update($data['id'], $userId, $data)) {
            echo json_encode(['success' => true, 'message' => 'Category updated']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update category']);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Category ID is required']);
            break;
        }
        if ($categoryModel->delete($id, $userId)) {
            echo json_encode(['success' => true, 'message' => 'Category deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to delete category']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>
