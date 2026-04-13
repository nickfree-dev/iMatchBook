<?php
// backend/models/Document.php

class Document {
    private $db;
    private $table = "receipts";

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($userId, $filters = []) {
        $sql = "SELECT r.*, p.name as property_name, c.name as category_name 
                FROM " . $this->table . " r
                LEFT JOIN properties p ON r.property_id = p.id
                LEFT JOIN categories c ON r.category_id = c.id
                WHERE r.user_id = :user_id";
        
        $params = [':user_id' => $userId];

        if (!empty($filters['property_id'])) {
            $sql .= " AND r.property_id = :property_id";
            $params[':property_id'] = $filters['property_id'];
        }

        $sql .= " ORDER BY r.upload_date DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id, $userId) {
        $sql = "SELECT * FROM " . $this->table . " WHERE id = :id AND user_id = :user_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id, ':user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function update($id, $userId, $data) {
        $fields = [];
        $params = [':id' => $id, ':user_id' => $userId];
        $allowed = ['property_id', 'category_id', 'doc_type', 'notes'];

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
        // Find path first to delete file
        $doc = $this->getById($id, $userId);
        if ($doc) {
            $sql = "DELETE FROM " . $this->table . " WHERE id = :id AND user_id = :user_id";
            $stmt = $this->db->prepare($sql);
            if ($stmt->execute([':id' => $id, ':user_id' => $userId])) {
                // Delete file if it exists
                $filePath = __DIR__ . "/../" . $doc['image_path'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                return true;
            }
        }
        return false;
    }
}
?>
