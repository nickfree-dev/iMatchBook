<?php
// backend/api/upload.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function logDebug($message) {
    file_put_contents('../uploads/debug_log.txt', date('[Y-m-d H:i:s] ') . $message . PHP_EOL, FILE_APPEND);
}

logDebug("Request received.");

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

try {
    require_once '../vendor/autoload.php';
    logDebug("Vendor autoload successful.");
} catch (Throwable $t) {
    logDebug("Vendor autoload failed: " . $t->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Backend init failed', 'debug' => $t->getMessage()]);
    exit;
}

use Google\Cloud\DocumentAI\V1\Client\DocumentProcessorServiceClient;
use Google\Cloud\DocumentAI\V1\ProcessRequest;
use Google\Cloud\DocumentAI\V1\RawDocument;

$response = ['success' => false, 'message' => ''];

if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileTmpPath = $_FILES['image']['tmp_name'];
    $fileName = $_FILES['image']['name'];
    $fileSize = $_FILES['image']['size'];
    $fileType = $_FILES['image']['type'];
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));

    $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');
    if (in_array($fileExtension, $allowedfileExtensions)) {
        // Use unique name
        $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
        $dest_path = $uploadDir . $newFileName;

        if(move_uploaded_file($fileTmpPath, $dest_path)) {
            
            // --- Duplicate Check ---
            $fileHash = md5_file($dest_path);
            $forceProcess = isset($_POST['force_process']) && $_POST['force_process'] === 'true';
            
            $database = new Database();
            $db = $database->getConnection();
            
            if ($db) {
                $checkQuery = "SELECT * FROM receipts WHERE file_hash = :hash LIMIT 1";
                $checkStmt = $db->prepare($checkQuery);
                $checkStmt->bindParam(':hash', $fileHash);
                $checkStmt->execute();
                
                if ($checkStmt->rowCount() > 0) {
                    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    
                    // Auto-retry if previous attempt failed (NULL data)
                    $isFailedRecord = is_null($existing['total_amount']) && is_null($existing['merchant_name']);
                    
                    if ($forceProcess || $isFailedRecord) {
                        // Delete existing to allow re-processing
                        logDebug("Overwriting duplicate/failed record. Hash: " . $fileHash);
                        $delQuery = "DELETE FROM receipts WHERE id = :id";
                        $delStmt = $db->prepare($delQuery);
                        $delStmt->bindParam(':id', $existing['id']);
                        $delStmt->execute();
                    } else {
                        // Return true duplicate
                        logDebug("Duplicate file detected. Hash: " . $fileHash);
                        
                        // Populate response with existing data
                        $response['success'] = true;
                        $response['is_duplicate'] = true;
                        $response['message'] = 'Duplicate receipt detected.';
                        $response['data'] = [
                            'image_path' => $existing['image_path'],
                            'merchant_name' => $existing['merchant_name'],
                            'date' => $existing['receipt_date'],
                            'total' => $existing['total_amount']
                        ];
                        
                        // Still need to find matches for this existing receipt to show in UI
                        $totalAmount = $existing['total_amount'];
                        $receiptDate = $existing['receipt_date'];
                        
                         // --- Match Finding Logic (Duplicated for existing case) ---
                        if ($totalAmount && $receiptDate) {
                             try {
                                $query = "SELECT * FROM bank_transactions 
                                          WHERE ABS(amount) = :amount 
                                          AND transaction_date BETWEEN DATE_SUB(:rdate, INTERVAL 3 DAY) AND DATE_ADD(:rdate, INTERVAL 3 DAY)";
                                $stmt = $db->prepare($query);
                                $stmt->bindParam(':amount', $totalAmount);
                                $stmt->bindParam(':rdate', $receiptDate);
                                $stmt->execute();
                                $response['matches'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                             } catch (Exception $e) { /* ignore */ }
                        }
                        
                        header('Content-Type: application/json');
                        echo json_encode($response);
                        exit;
                    }
                }
            }
            // -----------------------
            
            // --- AI Processing ---
            $merchantName = null;
            $receiptDate = null;
            $totalAmount = null;
            
            // Extended fields
            $paymentType = null;
            $cardLast4 = null;
            $currencyCode = null;
            $invoiceNumber = null;
            $supplierAddress = null;
            $supplierPhone = null;
            $lineItems = [];

            logDebug("Starting AI processing...");

            try {

                // Business Key Info
                $keyFile = __DIR__ . '/../imatchbook-app-key-business.json';
                logDebug("Key file path: " . $keyFile);
                if (!file_exists($keyFile)) {
                    logDebug("ERROR: Key file not found!");
                }

                $projectId = 'imatchbook-app-483500';
                $location = 'us';
                $processorId = '5bfcd6c689ac9bc2';

                logDebug("Initializing Client...");
                $client = new DocumentProcessorServiceClient([
                    'credentials' => $keyFile
                ]);
                logDebug("Client initialized.");

                $name = $client->processorName($projectId, $location, $processorId);
                logDebug("Processor name: " . $name);

                // Read file
                logDebug("Reading image file: " . $dest_path);
                $imageData = file_get_contents($dest_path);

                $rawDocument = new RawDocument();
                $rawDocument->setContent($imageData);
                $rawDocument->setMimeType($fileType);

                $processRequest = new ProcessRequest();
                $processRequest->setName($name);
                $processRequest->setRawDocument($rawDocument);

                logDebug("Sending request to Google...");
                $result = $client->processDocument($processRequest);
                logDebug("Response received from Google.");
                
                $document = $result->getDocument();
                
                $allEntities = []; // For debugging

                // Helper to extract entity data recursively
                $extractInfo = function($entity) use (&$extractInfo) {
                    $data = [
                        'type' => $entity->getType(),
                        'text' => $entity->getMentionText(),
                        'confidence' => $entity->getConfidence(),
                        'normalized' => $entity->getNormalizedValue() ? $entity->getNormalizedValue()->getText() : null,
                        'properties' => []
                    ];
                    
                    foreach ($entity->getProperties() as $prop) {
                        $data['properties'][] = $extractInfo($prop);
                    }
                    
                    return $data;
                };

                // Extract Entities
                foreach ($document->getEntities() as $entity) {
                    // Full debug extraction
                    $allEntities[] = $extractInfo($entity);

                    // Existing Logic for top-level fields
                    $type = $entity->getType();
                    $text = $entity->getMentionText(); // Or normalized value
                    $conf = $entity->getConfidence();
                    
                    // Log top level findings
                    logDebug("Entity found: Type=[$type], Text=[$text], Confidence=[$conf]");

                    if ($type === 'supplier_name' && !$merchantName) $merchantName = $text;
                    if ($type === 'receipt_date' && !$receiptDate) {
                         // Normalize date
                         if ($entity->getNormalizedValue()) {
                             $d = $entity->getNormalizedValue()->getDateValue();
                             if ($d) {
                                $receiptDate = sprintf('%04d-%02d-%02d', $d->getYear(), $d->getMonth(), $d->getDay());
                             }
                         }
                         if (!$receiptDate) $receiptDate = date('Y-m-d', strtotime($text));
                    }
                    if ($type === 'total_amount' && !$totalAmount) {
                         // Normalize
                         if ($entity->getNormalizedValue()) {
                             $money = $entity->getNormalizedValue()->getMoneyValue();
                             $units = $money->getUnits(); // int64
                             $nanos = $money->getNanos(); // int32
                             $totalAmount = $units + ($nanos / 1000000000);
                         } else {
                             $totalAmount = preg_replace('/[^0-9.]/', '', $text);
                         }
                    }
                    
                    // Extended Fields
                    if ($type === 'payment_type' && !$paymentType) $paymentType = $text;
                    if ($type === 'credit_card_last_four_digits' && !$cardLast4) $cardLast4 = $text;
                    if ($type === 'currency' && !$currencyCode) {
                        if ($entity->getNormalizedValue()) {
                            $currencyCode = $entity->getNormalizedValue()->getText(); // usually ISO code
                        } else {
                            $currencyCode = $text; // strict text
                        }
                    }
                    if ($type === 'invoice_id' && !$invoiceNumber) $invoiceNumber = $text;
                    if ($type === 'supplier_address' && !$supplierAddress) $supplierAddress = $text;
                    if ($type === 'supplier_phone_number' && !$supplierPhone) $supplierPhone = $text;

                    // Line Items
                    if ($type === 'line_item') {
                        $itemDesc = '';
                        $itemQty = 1.0;
                        $itemAmount = 0.0;
                        
                        foreach ($entity->getProperties() as $prop) {
                            $pType = $prop->getType();
                            $pText = $prop->getMentionText();
                            
                            // Check likely sub-types (normalization helps)
                            if (strpos($pType, 'description') !== false) {
                                $itemDesc = $pText;
                            }
                            if (strpos($pType, 'quantity') !== false) {
                                // Try normalize
                                if ($prop->getNormalizedValue()) {
                                    $itemQty = (float)$prop->getNormalizedValue()->getText();
                                } else {
                                    $itemQty = (float)preg_replace('/[^0-9.]/', '', $pText);
                                }
                            }
                            if (strpos($pType, 'amount') !== false) { // line_item/amount
                                if ($prop->getNormalizedValue()) {
                                     $money = $prop->getNormalizedValue()->getMoneyValue();
                                     $units = $money->getUnits();
                                     $nanos = $money->getNanos();
                                     $itemAmount = $units + ($nanos / 1000000000);
                                } else {
                                     $itemAmount = (float)preg_replace('/[^0-9.]/', '', $pText);
                                }
                            }
                        }
                        
                        $lineItems[] = [
                            'description' => $itemDesc,
                            'qty' => $itemQty,
                            'amount' => $itemAmount
                        ];
                    }
                }
                
                // Add raw entities to response data for frontend debugging
                $response['debug_entities'] = $allEntities;

                $client->close();
                logDebug("AI processing complete. Found: Merchant=$merchantName, Date=$receiptDate, Total=$totalAmount");

            } catch (Throwable $e) {
                // Log AI error but don't fail upload completely? 
                // For this feature, AI is critical, so maybe we include error in message
                logDebug("AI/Exception Error: " . $e->getMessage());
                $response['ai_error'] = $e->getMessage();
            }

            // Save to DB only if no AI error
            if (!isset($response['ai_error'])) {
                logDebug("Saving to database...");
                $database = new Database();
                $db = $database->getConnection();
                
                if($db) {
                    try {
                        // Insert Receipt
                        $query = "INSERT INTO receipts (
                            image_path, file_hash, merchant_name, receipt_date, total_amount, 
                            payment_type, card_last_4, currency_code, invoice_number, supplier_address, supplier_phone
                        ) VALUES (
                            :image_path, :hash, :merchant, :rdate, :total,
                            :payment, :card, :currency, :invoice, :address, :phone
                        )";
                        $stmt = $db->prepare($query);
                        $stmt->bindParam(':image_path', $newFileName);
                        $stmt->bindParam(':hash', $fileHash);
                        $stmt->bindParam(':merchant', $merchantName);
                        $stmt->bindParam(':rdate', $receiptDate);
                        $stmt->bindParam(':total', $totalAmount);
                        // Optional params
                        $stmt->bindParam(':payment', $paymentType);
                        $stmt->bindParam(':card', $cardLast4);
                        $stmt->bindParam(':currency', $currencyCode);
                        $stmt->bindParam(':invoice', $invoiceNumber);
                        $stmt->bindParam(':address', $supplierAddress);
                        $stmt->bindParam(':phone', $supplierPhone);
                        
                        if($stmt->execute()) {
                             $receiptId = $db->lastInsertId();
                             
                             // Insert Line Items
                             if (!empty($lineItems)) {
                                 $itemQuery = "INSERT INTO receipt_line_items (receipt_id, description, qty, amount) VALUES (:rid, :desc, :qty, :amt)";
                                 $itemStmt = $db->prepare($itemQuery);
                                 foreach ($lineItems as $item) {
                                     $itemStmt->execute([
                                         ':rid' => $receiptId,
                                         ':desc' => $item['description'],
                                         ':qty' => $item['qty'],
                                         ':amt' => $item['amount']
                                     ]);
                                 }
                             }
                        
                             $response['success'] = true;
                             $response['message'] = 'Receipt processed successfully.';
                             $response['data'] = [
                                 'image_path' => $newFileName,
                                 'merchant_name' => $merchantName,
                                 'date' => $receiptDate,
                                 'total' => $totalAmount,
                                 'payment_type' => $paymentType,
                                 'card_last_4' => $cardLast4,
                                 'invoice_number' => $invoiceNumber,
                                 'line_items_count' => count($lineItems),
                                 'currency' => $currencyCode,
                                 'address' => $supplierAddress
                             ];
                        } else {
                             $response['message'] = 'Failed to save to database.';
                        }
                    } catch (PDOException $e) {
                         $response['message'] = 'Database error: ' . $e->getMessage();
                    }
                    
                    // --- Match Finding Logic ---
                    if ($totalAmount && $receiptDate) {
                        try {
                            // Look for transactions with matching amount within +/- 3 days
                            // Note: Bank transactions are often negative for expenses, receipt amount is usually positive.
                            // So we compare absolute values or assume bank amount is negative.
                            
                            $query = "SELECT * FROM bank_transactions 
                                      WHERE ABS(amount) = :amount 
                                      AND transaction_date BETWEEN DATE_SUB(:rdate, INTERVAL 3 DAY) AND DATE_ADD(:rdate, INTERVAL 3 DAY)";
                            
                            $stmt = $db->prepare($query);
                            $stmt->bindParam(':amount', $totalAmount);
                            $stmt->bindParam(':rdate', $receiptDate);
                            
                            $stmt->execute();
                            $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
                            
                            $response['matches'] = $matches;
                            logDebug("Found " . count($matches) . " potential matches in bank transactions.");
                            
                        } catch (PDOException $e) {
                            logDebug("Error matching transactions: " . $e->getMessage());
                        }
                    }
                    // ---------------------------
                } else {
                     $response['message'] = 'Database connection failed.';
                }
            } else {
                logDebug("Skipping DB save due to AI error.");
                // Ensure message reflects error
                if(!isset($response['message']) || empty($response['message'])) {
                   $response['message'] = 'AI Extraction failed.';
                }
            }
        } else {
            $response['message'] = 'There was some error moving the file to upload directory.';
        }
    } else {
        $response['message'] = 'Upload failed. Allowed file types: ' . implode(',', $allowedfileExtensions);
    }
} else {
     $response['message'] = 'No file uploaded or upload error. Error code: ' . ($_FILES['image']['error'] ?? 'Unknown');
}

header('Content-Type: application/json');
echo json_encode($response);
?>
