<?php
// backend/test_login_raw.php
// Mock a login request and show exactly what's returned.

$_SERVER['REQUEST_METHOD'] = 'POST';
$input = json_encode(['email' => 'admin@imatchbook.local', 'password' => 'changeme123']);

// We can't easily mock php://input without stream wrappers, so we'll just check if the files have any output.
ob_start();
include 'api/auth/login.php';
$output = ob_get_clean();

file_put_contents('scratch/raw_login_output.txt', $output);
echo "Length: " . strlen($output) . "\n";
echo "First 100 chars: " . substr($output, 0, 100) . "...\n";
