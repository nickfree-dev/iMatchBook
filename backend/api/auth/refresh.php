<?php
// backend/api/auth/refresh.php
// POST /api/auth/refresh
// Reads the HttpOnly refresh cookie, validates it, and returns a new access token.

ob_start();
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

header('Content-Type: application/json');

// --- CATCH NOISE ---
$noise = ob_get_clean();
if (!empty($noise)) {
    error_log("REFRESH NOISE DETECTED: " . bin2hex($noise));
}
ob_start();

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

$refreshToken = $_COOKIE[JWT_REFRESH_COOKIE] ?? null;
if (!$refreshToken) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No refresh token found.']);
    exit;
}

try {
    $decoded = JWT::decode($refreshToken, new Key(JWT_SECRET, JWT_ALGORITHM));
} catch (ExpiredException $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Refresh token expired. Please log in again.']);
    exit;
} catch (Throwable $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid refresh token.']);
    exit;
}

if (($decoded->typ ?? '') !== 'refresh') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid token type.']);
    exit;
}

$userId = (int) $decoded->sub;

// Validate against DB (ensures token hasn't been revoked via logout)
$database = new Database();
$db = $database->getConnection();
$stmt = $db->prepare('SELECT id, name, email, refresh_token FROM users WHERE id = :id LIMIT 1');
$stmt->execute([':id' => $userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || $user['refresh_token'] !== $refreshToken) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Refresh token revoked or not found.']);
    exit;
}

// Issue a new access token
$now = time();
$accessPayload = [
    'iss'  => 'imatchbook',
    'iat'  => $now,
    'exp'  => $now + JWT_ACCESS_TTL,
    'sub'  => (string) $user['id'],
    'name' => $user['name'],
    'email'=> $user['email'],
];
$newAccessToken = JWT::encode($accessPayload, JWT_SECRET, JWT_ALGORITHM);

$resp = json_encode([
    'success'      => true,
    'access_token' => $newAccessToken,
    'expires_in'   => JWT_ACCESS_TTL,
]);

$moreNoise = ob_get_clean();
if (!empty($moreNoise)) {
    error_log("REFRESH MORE NOISE: " . bin2hex($moreNoise));
}
echo $resp;
