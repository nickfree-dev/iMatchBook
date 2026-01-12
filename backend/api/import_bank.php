<?php
// backend/api/import_bank.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

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
            
            // Header Detection (Row 1 or scanning first few rows)
            if ($row == 1) {
                // Determine indices based on keywords
                $lowerLine = array_map('strtolower', $line);
                
                foreach ($lowerLine as $index => $colName) {
                    if (strpos($colName, 'date') !== false) {
                        // Prefer 'transaction date' over 'post date' if both exist, but for now take first 'date' found if not set
                        // Or logic: if strictly contains "transaction" or just "date" update
                        if ($dateIdx === -1 || strpos($colName, 'transaction') !== false) {
                            $dateIdx = $index;
                        }
                    }
                    if (strpos($colName, 'description') !== false || strpos($colName, 'memo') !== false || strpos($colName, 'payee') !== false || strpos($colName, 'desc') !== false) {
                         // Ensure we don't overwrite if we found a "better" one? 
                         // "Description" is best.
                         if ($descIdx === -1 || strpos($colName, 'description') !== false) {
                             $descIdx = $index;
                         }
                    }
                    if (strpos($colName, 'amount') !== false) {
                        $amountIdx = $index;
                    }
                }

                // If we found headers, skip this row.
                if ($dateIdx !== -1 && $amountIdx !== -1) {
                    continue; 
                }
                
                // If we didn't find headers, maybe it's data?
                // But generally safe to fail if we can't find columns in a "Bank Import" feature requiring mapping.
                 // Fallback/Legacy test: 0,1,2
                if ($dateIdx === -1) $dateIdx = 0;
                if ($descIdx === -1) $descIdx = 1;
                if ($amountIdx === -1) $amountIdx = 2;
                
                 // Check if actually header by testing parsing? No, let's assume if it looks like header text we skip.
                 // But simply resetting to read next lines is cleaner.
                 // RE-READ logic needed if Row 1 was data.
                 // For now: Assume strictly Row 1 is header OR data.
                 // If we mapped columns via header match, we continue.
                 // If we didn't match strictly, we guessed 0,1,2.
                 // If row 1 contains "Date" text, we skip it regardless.
                 if (stripos($line[$dateIdx], 'date') !== false) {
                     continue;
                 }
            }

            // Safety check
            if (!isset($line[$dateIdx]) || !isset($line[$amountIdx])) {
                continue;
            }

            // Data extraction
            $rawDate = $line[$dateIdx] ?? '';
            $description = $line[$descIdx] ?? '';
            $rawAmount = $line[$amountIdx] ?? 0;

            // Date Parsing
            // Handle common formats: MM/DD/YYYY, YYYY-MM-DD
            $dateTimestamp = strtotime($rawDate);
            if (!$dateTimestamp) {
                // Try strptime or others? strtotime is robust.
                continue; 
            }
            $mysqlDate = date("Y-m-d", $dateTimestamp);

            // Clean Amount
            $amount = $rawAmount;
            // Remove '"' and currency symbols '$', ','
            $amount = str_replace(['$', ',', '"'], '', $amount);
            
            // Handle '(100.00)' as negative? Bank CSVs often use -100.00 but check for parentheses.
            if (strpos($amount, '(') !== false && strpos($amount, ')') !== false) {
                $amount = '-' . str_replace(['(', ')'], '', $amount);
            }
            
            if (!is_numeric($amount)) $amount = 0;

            // Only insert if valid date and meaningful amount? (Allow 0?)
            $stmt->bindParam(':date', $mysqlDate);
            $stmt->bindParam(':desc', $description);
            $stmt->bindParam(':amount', $amount);
            
            if ($stmt->execute()) {
                $importedCount++;
            }
        }
        
        $db->commit();
        fclose($handle);
        
        if ($importedCount === 0) {
             $response['message'] = "No transactions imported. Check CSV format.";
        } else {
             $response['success'] = true;
             $response['message'] = "Imported $importedCount transactions successfully.";
        }

    } catch (Exception $e) {
        $db->rollBack();
        $response['message'] = "Error importing: " . $e->getMessage();
    }

} else {
    $response['message'] = 'No file uploaded or upload error.';
}

header('Content-Type: application/json');
echo json_encode($response);
?>
