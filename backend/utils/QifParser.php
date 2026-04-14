<?php
// backend/utils/QifParser.php
// Parses Quicken Interchange Format (QIF) bank export files.
// QIF format uses ! for type declarations and ^ as record separators.
// Each transaction record begins with D (date), T (amount), P (payee), M (memo).

class QifParser {

    /**
     * Parse a QIF file into normalized transaction rows.
     *
     * @param  string $filePath     Absolute path to the uploaded .qif file
     * @param  bool   $previewOnly  If true, returns first 10 rows only
     * @return array  ['success' => bool, 'rows' => [...], 'error' => string|null]
     */
    public static function parse(string $filePath, bool $previewOnly = false): array {
        $content = file_get_contents($filePath);
        if ($content === false) {
            return ['success' => false, 'error' => 'Could not read QIF file.', 'rows' => []];
        }

        // Normalize line endings
        $content = str_replace("\r\n", "\n", $content);
        $content = str_replace("\r",   "\n", $content);
        $lines   = explode("\n", $content);

        $rows           = [];
        $skipped        = 0;
        $currentRecord  = [];
        $accountType    = null;

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            $code  = $line[0];
            $value = substr($line, 1);

            switch ($code) {
                case '!':
                    // Type header: e.g. !Type:Bank
                    $accountType = $value;
                    break;

                case 'D':
                    // Date
                    $currentRecord['raw_date'] = $value;
                    break;

                case 'T':
                    // Amount — QIF uses commas for thousands: e.g. -1,234.56
                    $currentRecord['raw_amount'] = $value;
                    break;

                case 'P':
                    // Payee (primary description)
                    $currentRecord['payee'] = $value;
                    break;

                case 'M':
                    // Memo (secondary description, use if payee is empty)
                    $currentRecord['memo'] = $value;
                    break;

                case 'N':
                    // Check number / reference number
                    $currentRecord['ref'] = $value;
                    break;

                case 'C':
                    // Cleared status: * or X = cleared, blank = uncleared
                    $currentRecord['cleared'] = ($value === '*' || $value === 'X');
                    break;

                case '^':
                    // Record separator — process current record
                    if (!empty($currentRecord)) {
                        $normalized = self::normalizeRecord($currentRecord);
                        if ($normalized !== null) {
                            $rows[] = $normalized;
                        } else {
                            $skipped++;
                        }
                        $currentRecord = [];

                        if ($previewOnly && count($rows) >= 10) {
                            break 2; // break out of foreach
                        }
                    }
                    break;
            }
        }

        // Process last record if file doesn't end with ^
        if (!empty($currentRecord)) {
            $normalized = self::normalizeRecord($currentRecord);
            if ($normalized !== null) $rows[] = $normalized;
        }

        return [
            'success' => true,
            'rows'    => $rows,
            'total'   => count($rows),
            'skipped' => $skipped,
            'format'  => 'QIF',
            'error'   => null,
        ];
    }

    private static function normalizeRecord(array $record): ?array {
        $rawDate   = $record['raw_date']   ?? '';
        $rawAmount = $record['raw_amount'] ?? '0';
        $desc      = trim($record['payee'] ?? $record['memo'] ?? '');

        // QIF dates can be: M/D/Y, D/M/Y, M-D-Y, YYYY/MM/DD, MM/DD/YYYY etc.
        // Try multiple formats
        $ts = strtotime($rawDate);

        // Handle QIF-specific formats like 1/ 2/24 or 1/ 2'24
        if (!$ts) {
            $cleaned = preg_replace("/['\s]/", '/', $rawDate);
            $ts = strtotime($cleaned);
        }

        // Try D/M/Y interpretation for ambiguous dates
        if (!$ts) {
            $parts = preg_split('/[\/-]/', trim($rawDate));
            if (count($parts) === 3) {
                // Try Y/M/D
                $ts = mktime(0, 0, 0, (int)$parts[1], (int)$parts[2], (int)$parts[0]);
                if (!$ts || $ts < 0) $ts = false;
            }
        }

        if (!$ts) return null; // Can't parse date — skip

        $date = date('Y-m-d', $ts);

        // Normalize amount: remove commas, $, spaces
        $amount = str_replace([',', '$', ' '], '', $rawAmount);
        $amount = is_numeric($amount) ? (float)$amount : 0.0;

        return [
            'date'        => $date,
            'description' => $desc ?: 'QIF Transaction',
            'amount'      => $amount,
        ];
    }
}
?>
