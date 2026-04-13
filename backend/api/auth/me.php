<?php
// backend/api/auth/me.php
// GET /api/auth/me
// Returns the currently authenticated user's info from their JWT.

require_once __DIR__ . '/../../middleware/auth.php';

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

header('Content-Type: application/json');

$user = auth_require();

echo json_encode([
    'success' => true,
    'user' => [
        'id'    => $user->sub,
        'name'  => $user->name,
        'email' => $user->email,
    ],
]);
