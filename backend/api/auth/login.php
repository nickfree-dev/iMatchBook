<?php
// backend/api/auth/login.php
// POST /api/auth/login
// Body: { "email": "...", "password": "..." }
// Returns: { "success": true, "access_token": "...", "user": {...} }
// Also sets HttpOnly refresh token cookie.

ob_start(); // Start buffering immediately to catch ANY noise from includes
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

header('Content-Type: application/json');

// --- CATCH NOISE FROM INCLUDES ---
$noise = ob_get_clean();
if (!empty($noise)) {
    error_log("LOGIN NOISE DETECTED: " . bin2hex($noise));
}
ob_start();

$body  = json_decode(file_get_contents('php://input'), true);
$email = trim($body['email'] ?? '');
$pass  = $body['password'] ?? '';
error_log("LOGIN: Email: $email");

if (!$email || !$pass) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

// --- DB lookup ---
$database = new Database();
$db = $database->getConnection();
if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

$stmt = $db->prepare('SELECT id, name, email, password_hash FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
error_log("LOGIN: User found: " . ($user ? 'YES' : 'NO'));

if (!$user || !password_verify($pass, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid email or password.']);
    exit;
}

// --- Issue tokens ---
$now = time();

// Access Token (short-lived, 15 min)
$accessPayload = [
    'iss'  => 'imatchbook',
    'iat'  => $now,
    'exp'  => $now + JWT_ACCESS_TTL,
    'sub'  => (string) $user['id'],
    'name' => $user['name'],
    'email'=> $user['email'],
];
try {
    $accessToken = JWT::encode($accessPayload, JWT_SECRET, JWT_ALGORITHM);
    error_log("LOGIN: Access token generated");
} catch (Throwable $e) {
    error_log("LOGIN: JWT Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'JWT error: ' . $e->getMessage()]);
    exit;
}

// Refresh Token (long-lived, 7 days)
$refreshPayload = [
    'iss' => 'imatchbook',
    'iat' => $now,
    'exp' => $now + JWT_REFRESH_TTL,
    'sub' => (string) $user['id'],
    'typ' => 'refresh',
];
$refreshToken = JWT::encode($refreshPayload, JWT_SECRET, JWT_ALGORITHM);
error_log("LOGIN: Refresh token generated");

// Store refresh token in DB for server-side revocation
$upd = $db->prepare('UPDATE users SET refresh_token = :rt WHERE id = :id');
$upd->execute([':rt' => $refreshToken, ':id' => $user['id']]);

// Set HttpOnly cookie for refresh token
$cookieOptions = [
    'expires'  => $now + JWT_REFRESH_TTL,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict',
];
setcookie(JWT_REFRESH_COOKIE, $refreshToken, $cookieOptions);

error_log("LOGIN: Final echo");
$output = json_encode([
    'success'      => true,
    'access_token' => $accessToken,
    'expires_in'   => JWT_ACCESS_TTL,
    'user' => [
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
    ],
]);

// Clear any accidental output again (e.g. from setcookie warnings)
$moreNoise = ob_get_clean();
if (!empty($moreNoise)) {
    error_log("LOGIN MORE NOISE: " . bin2hex($moreNoise));
}

echo $output;
error_log("LOGIN: Done");
