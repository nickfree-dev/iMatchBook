<?php
// backend/api/import_bank.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../middleware/auth.php';

cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

header('Content-Type: application/json');
$authUser = auth_require();

require_once '../config/db.php';

$response = ['success' => false, 'message' => ''];

if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['file']['tmp_name'];
    $fileName = $_FILES['file']['name'];

    // Validate CSV extension
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));
    if ($fileExtension !== 'csv') {
        echo json_encode(['success' => false, 'message' => 'Invalid file type. Only CSV allowed.']);
        exit;
    }

    $handle = fopen($fileTmpPath, "r");
    if ($handle === FALSE) {
        echo json_encode(['success' => false, 'message' => 'Could not open CSV file.']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
        exit;
    }

    $importedCount = 0;
    $row = 0;

    // Dynamic Column Mapping
    $dateIdx = -1;
    $descIdx = -1;
    $amountIdx = -1;

    try {
        $db->beginTransaction();
        $stmt = $db->prepare("INSERT INTO bank_transactions (transaction_date, description, amount) VALUES (:date, :desc, :amount)");

        while (($line = fgetcsv($handle, 2000, ",")) !== FALSE) {
            $row++;

            if ($row == 1) {
                $lowerLine = array_map('strtolower', $line);
                foreach ($lowerLine as $index => $colName) {
                    if (strpos($colName, 'date') !== false) {
                        if ($dateIdx === -1 || strpos($colName, 'transaction') !== false) {
                            $dateIdx = $index;
                        }
                    }
                    if (strpos($colName, 'description') !== false || strpos($colName, 'memo') !== false || strpos($colName, 'payee') !== false || strpos($colName, 'desc') !== false) {
                        if ($descIdx === -1 || strpos($colName, 'description') !== false) {
                            $descIdx = $index;
                        }
                    }
                    if (strpos($colName, 'amount') !== false) {
                        $amountIdx = $index;
                    }
                }
                if ($dateIdx !== -1 && $amountIdx !== -1) { continue; }
                if ($dateIdx === -1) $dateIdx = 0;
                if ($descIdx === -1) $descIdx = 1;
                if ($amountIdx === -1) $amountIdx = 2;
                if (stripos($line[$dateIdx], 'date') !== false) { continue; }
            }

            if (!isset($line[$dateIdx]) || !isset($line[$amountIdx])) { continue; }

            $rawDate = $line[$dateIdx] ?? '';
            $description = $line[$descIdx] ?? '';
            $rawAmount = $line[$amountIdx] ?? 0;

            $dateTimestamp = strtotime($rawDate);
            if (!$dateTimestamp) { continue; }
            $mysqlDate = date("Y-m-d", $dateTimestamp);

            $amount = str_replace(['$', ',', '"'], '', $rawAmount);
            if (strpos($amount, '(') !== false && strpos($amount, ')') !== false) {
                $amount = '-' . str_replace(['(', ')'], '', $amount);
            }
            if (!is_numeric($amount)) $amount = 0;

            $stmt->bindParam(':date', $mysqlDate);
            $stmt->bindParam(':desc', $description);
            $stmt->bindParam(':amount', $amount);
            if ($stmt->execute()) { $importedCount++; }
        }

        $db->commit();
        fclose($handle);

        if ($importedCount === 0) {
            $response['message'] = "No transactions imported. Check CSV format.";
        } else {
            $response['success'] = true;
            $response['message'] = "Imported $importedCount transactions successfully.";
            $response['count'] = $importedCount;
        }

    } catch (Exception $e) {
        $db->rollBack();
        $response['message'] = "Error importing: " . $e->getMessage();
    }

} else {
    $response['message'] = 'No file uploaded or upload error.';
}

echo json_encode($response);
