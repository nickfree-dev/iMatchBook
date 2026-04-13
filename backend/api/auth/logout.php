<?php
// backend/api/auth/logout.php
// POST /api/auth/logout
// Clears the refresh cookie and revokes the token in the DB.

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

header('Content-Type: application/json');

// Expire the refresh cookie
setcookie(JWT_REFRESH_COOKIE, '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict',
]);

// If we have a valid access token, revoke the refresh token in DB
$headers = getallheaders();
$auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if (str_starts_with($auth, 'Bearer ')) {
    try {
        $token   = substr($auth, 7);
        $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(JWT_SECRET, JWT_ALGORITHM));
        $userId  = (int) $decoded->sub;

        $database = new Database();
        $db       = $database->getConnection();
        if ($db) {
            $stmt = $db->prepare('UPDATE users SET refresh_token = NULL WHERE id = :id');
            $stmt->execute([':id' => $userId]);
        }
    } catch (Throwable $e) {
        // Token already invalid — that's fine, just clear the cookie
    }
}

echo json_encode(['success' => true, 'message' => 'Logged out successfully.']);
