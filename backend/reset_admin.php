<?php
// backend/reset_admin.php
// Script to reset the admin password to 'changeme123'
require_once __DIR__ . '/config/db.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("❌ Database connection failed.\n");
}

$email = 'admin@imatchbook.local';
$password = 'changeme123';
$hash = password_hash($password, PASSWORD_BCRYPT);

try {
    $stmt = $db->prepare("UPDATE users SET password_hash = :hash WHERE email = :email");
    $stmt->execute([':hash' => $hash, ':email' => $email]);
    
    if ($stmt->rowCount() > 0) {
        echo "✅ Password for $email has been reset to '$password'.\n";
    } else {
        // If user doesn't exist, create it
        $stmt = $db->prepare("INSERT INTO users (name, email, password_hash) VALUES ('Admin', :email, :hash)");
        $stmt->execute([':email' => $email, ':hash' => $hash]);
        echo "✅ Admin user created with password '$password'.\n";
    }
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
