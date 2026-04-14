<?php
// backend/utils/CsvParser.php
// Parses a bank statement CSV file.
// Returns an array of normalized transaction rows.

class CsvParser {

    /**
     * Parse a CSV file into normalized transaction rows.
     *
     * @param  string $filePath  Absolute path to the temporary uploaded file
     * @param  bool   $previewOnly  If true, returns first 10 rows without inserting
     * @return array  ['success' => bool, 'rows' => [...], 'error' => string|null, 'column_map' => [...]]
     */
    public static function parse(string $filePath, bool $previewOnly = false): array {
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            return ['success' => false, 'error' => 'Could not open file.', 'rows' => []];
        }

        $rows        = [];
        $rowIndex    = 0;
        $dateIdx     = -1;
        $descIdx     = -1;
        $amountIdx   = -1;
        $headerRow   = [];
        $skipped     = 0;

        while (($line = fgetcsv($handle, 4096, ',')) !== false) {
            $rowIndex++;

            // --- Header row detection ---
            if ($rowIndex === 1) {
                $headerRow  = $line;
                $lowerLine  = array_map('strtolower', array_map('trim', $line));

                foreach ($lowerLine as $i => $col) {
                    // Date column
                    if (strpos($col, 'date') !== false) {
                        if ($dateIdx === -1 || strpos($col, 'transaction') !== false || strpos($col, 'post') !== false) {
                            $dateIdx = $i;
                        }
                    }
                    // Description column
                    if (preg_match('/(description|memo|payee|merchant|desc|narrative|detail)/', $col)) {
                        if ($descIdx === -1 || strpos($col, 'description') !== false || strpos($col, 'merchant') !== false) {
                            $descIdx = $i;
                        }
                    }
                    // Amount column (prefer a general "amount" over "balance")
                    if (strpos($col, 'amount') !== false && strpos($col, 'balance') === false) {
                        $amountIdx = $i;
                    }
                }

                // Fallback defaults if header not found
                if ($dateIdx   === -1) $dateIdx   = 0;
                if ($descIdx   === -1) $descIdx   = 1;
                if ($amountIdx === -1) $amountIdx = 2;

                // If first row looks like a header (contains "date"), skip it as data
                if (stripos($line[$dateIdx] ?? '', 'date') !== false) {
                    continue;
                }
            }

            // --- Data rows ---
            $rawDate   = trim($line[$dateIdx]   ?? '');
            $desc      = trim($line[$descIdx]   ?? '');
            $rawAmount = trim($line[$amountIdx] ?? '0');

            // Skip blank lines
            if ($rawDate === '' && $desc === '' && $rawAmount === '') {
                $skipped++;
                continue;
            }

            // Normalize date
            $ts = strtotime($rawDate);
            if (!$ts) {
                $skipped++;
                continue;
            }
            $date = date('Y-m-d', $ts);

            // Normalize amount: strip $, commas, quotes; handle (1234.56) negatives
            $amount = str_replace(['$', ',', '"', "'", ' '], '', $rawAmount);
            if (preg_match('/^\(.*\)$/', $amount)) {
                $amount = '-' . str_replace(['(', ')'], '', $amount);
            }
            $amount = is_numeric($amount) ? (float)$amount : 0.0;

            $rows[] = [
                'date'        => $date,
                'description' => $desc,
                'amount'      => $amount,
                'raw'         => $line,  // original for debug / preview
            ];

            if ($previewOnly && count($rows) >= 10) {
                break;
            }
        }

        fclose($handle);

        return [
            'success'    => true,
            'rows'       => $rows,
            'total'      => count($rows),
            'skipped'    => $skipped,
            'column_map' => [
                'date_col'   => $headerRow[$dateIdx]   ?? "Column $dateIdx",
                'desc_col'   => $headerRow[$descIdx]   ?? "Column $descIdx",
                'amount_col' => $headerRow[$amountIdx] ?? "Column $amountIdx",
            ],
            'error'      => null,
        ];
    }
}
?>
