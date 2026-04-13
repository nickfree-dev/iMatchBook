<?php
// backend/config/jwt.php
// JWT configuration - reads secret from environment variable.
// IMPORTANT: In production, set JWT_SECRET to a long random string (32+ chars).

define('JWT_SECRET',      getenv('JWT_SECRET')      ?: 'imatchbook_dev_secret_change_in_production_32chars');
define('JWT_ALGORITHM',   'HS256');
define('JWT_ACCESS_TTL',  15 * 60);          // 15 minutes (seconds)
define('JWT_REFRESH_TTL', 7 * 24 * 60 * 60); // 7 days (seconds)
define('JWT_REFRESH_COOKIE', 'imb_refresh');
