<?php
// backend/api/transactions/import.php
// Handles bank statement import: CSV and QIF formats.
// Supports two modes:
//   action=preview  — parse file, return rows WITHOUT committing to DB
//   action=commit   — save parsed rows to bank_transactions with optional property/user assignment
//
// POST multipart: file (required), action (preview|commit), property_id (optional)

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/CsvParser.php';
require_once __DIR__ . '/../../utils/QifParser.php';

cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$user   = auth_require();
$userId = $user->sub;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// --- Validate file ---
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errCode = $_FILES['file']['error'] ?? 'none';
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => "No file uploaded or upload error (code: $errCode)"]);
    exit;
}

$fileTmpPath = $_FILES['file']['tmp_name'];
$fileName    = strtolower(trim($_FILES['file']['name']));
$action      = strtolower(trim($_POST['action'] ?? 'preview')); // preview | commit
$propertyId  = !empty($_POST['property_id']) ? (int)$_POST['property_id'] : null;
$accountId   = !empty($_POST['account_id']) ? (int)$_POST['account_id'] : null;

// Detect format from extension
$ext = pathinfo($fileName, PATHINFO_EXTENSION);

if (!in_array($ext, ['csv', 'qif', 'ofx'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => "Unsupported file type: .$ext — please upload a CSV or QIF file."]);
    exit;
}

// --- Parse the file ---
$previewOnly = ($action === 'preview');
$parseResult = null;

if ($ext === 'csv') {
    $parseResult = CsvParser::parse($fileTmpPath, $previewOnly);
} elseif ($ext === 'qif') {
    $parseResult = QifParser::parse($fileTmpPath, $previewOnly);
} else {
    // OFX: not yet implemented — return friendly error
    echo json_encode([
        'success' => false,
        'error'   => 'OFX format is not yet supported. Please export as CSV or QIF from your bank.'
    ]);
    exit;
}

if (!$parseResult['success']) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => $parseResult['error']]);
    exit;
}

$rows = $parseResult['rows'];

// --- Preview mode: return first rows for review ---
if ($action === 'preview') {
    echo json_encode([
        'success'    => true,
        'action'     => 'preview',
        'format'     => strtoupper($ext),
        'rows'       => $rows,           // up to 10 rows for preview
        'column_map' => $parseResult['column_map'] ?? null,
        'message'    => "Preview of up to 10 rows. Confirm to import all.",
    ]);
    exit;
}

// --- Commit mode: insert all rows into DB ---
if ($action === 'commit') {
    // For commit, we need the FULL parse (not preview-only). Re-parse if needed.
    if ($previewOnly) {
        if ($ext === 'csv') {
            $parseResult = CsvParser::parse($fileTmpPath, false);
        } else {
            $parseResult = QifParser::parse($fileTmpPath, false);
        }
        $rows = $parseResult['rows'];
    }

    if (empty($rows)) {
        echo json_encode(['success' => false, 'error' => 'No valid rows found in the file to import.']);
        exit;
    }

    $database  = new Database();
    $db        = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
        exit;
    }

    $imported = 0;
    $dupes    = 0;

    try {
        $db->beginTransaction();

        $stmt = $db->prepare(
            "INSERT INTO bank_transactions (user_id, transaction_date, description, amount, property_id, account_id, source)
             VALUES (:user_id, :date, :desc, :amount, :property_id, :account_id, :source)"
        );

        $source = strtolower($ext); // 'csv' or 'qif'

        foreach ($rows as $row) {
            try {
                $stmt->execute([
                    ':user_id'     => $userId,
                    ':date'        => $row['date'],
                    ':desc'        => $row['description'],
                    ':amount'      => $row['amount'],
                    ':property_id' => $propertyId,
                    ':account_id'  => $accountId,
                    ':source'      => $source,
                ]);
                $imported++;
            } catch (PDOException $e) {
                // Duplicate key or other row error — count and skip
                $dupes++;
            }
        }

        $db->commit();

        echo json_encode([
            'success'  => true,
            'action'   => 'commit',
            'imported' => $imported,
            'skipped'  => ($parseResult['skipped'] ?? 0) + $dupes,
            'message'  => "Successfully imported $imported transactions." . ($dupes > 0 ? " ($dupes skipped as duplicates)" : ''),
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Import failed: ' . $e->getMessage()]);
    }

    exit;
}

// Unknown action
http_response_code(400);
echo json_encode(['success' => false, 'error' => "Unknown action: $action. Use 'preview' or 'commit'."]);
?>
