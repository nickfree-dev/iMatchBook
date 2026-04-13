<?php
// backend/middleware/auth.php
// Include this file at the top of every protected endpoint.
// It validates the Bearer token and sets $GLOBALS['auth_user'] with the payload.

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/jwt.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Firebase\JWT\BeforeValidException;

/**
 * Sends CORS + auth error headers and exits.
 */
function auth_deny(string $message, int $code = 401): never {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => $message, 'code' => $code]);
    exit;
}

/**
 * Emits the standard CORS headers required on every endpoint.
 * Call this BEFORE auth_require() so OPTIONS preflight still gets CORS headers.
 */
function cors_headers(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

/**
 * Validates the Authorization: Bearer <token> header.
 * On success, stores the decoded payload in $GLOBALS['auth_user'] and returns it.
 * On failure, sends 401 JSON and exits.
 */
function auth_require(): object {
    $headers = getallheaders();
    $auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!str_starts_with($auth, 'Bearer ')) {
        auth_deny('Missing or malformed Authorization header.');
    }

    $token = substr($auth, 7);

    try {
        $decoded = JWT::decode($token, new Key(JWT_SECRET, JWT_ALGORITHM));
        $GLOBALS['auth_user'] = $decoded;
        return $decoded;
    } catch (ExpiredException $e) {
        auth_deny('Access token expired. Please refresh.', 401);
    } catch (SignatureInvalidException | BeforeValidException $e) {
        auth_deny('Invalid token signature.', 401);
    } catch (Throwable $e) {
        auth_deny('Token validation failed: ' . $e->getMessage(), 401);
    }
}
