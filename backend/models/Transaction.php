<?php
// backend/models/Transaction.php

class Transaction {
    private $db;
    private $table = "bank_transactions";

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Get transactions with optional filtering
     */
    public function getAll($userId, $filters = []) {
        $sql = "SELECT t.*, p.name as property_name, c.name as category_name, c.color as category_color, c.type as category_type, a.name as account_name 
                FROM " . $this->table . " t
                LEFT JOIN properties p ON t.property_id = p.id
                LEFT JOIN categories c ON t.category_id = c.id
                LEFT JOIN accounts a ON t.account_id = a.id
                WHERE t.user_id = :user_id";
        
        $params = [':user_id' => $userId];

        if (!empty($filters['property_id'])) {
            $sql .= " AND t.property_id = :property_id";
            $params[':property_id'] = $filters['property_id'];
        }

        if (!empty($filters['category_id'])) {
            $sql .= " AND t.category_id = :category_id";
            $params[':category_id'] = $filters['category_id'];
        }

        if (!empty($filters['is_reviewed'])) {
            $sql .= " AND t.is_reviewed = :is_reviewed";
            $params[':is_reviewed'] = $filters['is_reviewed'];
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND t.transaction_date >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND t.transaction_date <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $sql .= " ORDER BY t.transaction_date DESC, t.id DESC";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update transaction fields (PATCH-like)
     */
    public function update($id, $userId, $data) {
        $fields = [];
        $params = [':id' => $id, ':user_id' => $userId];

        // Allowed fields for update
        $allowed = ['property_id', 'category_id', 'account_id', 'notes', 'is_reviewed', 'receipt_id', 'linked_transaction_id'];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (empty($fields)) return false;

        $sql = "UPDATE " . $this->table . " SET " . implode(', ', $fields) . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($id, $userId) {
        $sql = "DELETE FROM " . $this->table . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id, ':user_id' => $userId]);
    }

    /**
     * Update multiple transactions at once
     */
    public function bulkUpdate($ids, $userId, $data) {
        if (empty($ids)) return false;
        
        $fields = [];
        $params = [':user_id' => $userId];

        // Allowed fields for bulk update
        $allowed = ['property_id', 'category_id', 'account_id', 'is_reviewed'];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (empty($fields)) return false;

        $idPlaceholders = [];
        foreach ($ids as $index => $id) {
            $placeholder = ":id$index";
            $idPlaceholders[] = $placeholder;
            $params[$placeholder] = $id;
        }

        $sql = "UPDATE " . $this->table . " 
                SET " . implode(', ', $fields) . " 
                WHERE user_id = :user_id AND id IN (" . implode(', ', $idPlaceholders) . ")";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
}
?>
