<?php
// backend/models/Property.php

class Property {
    private $db;
    private $table = "properties";

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($userId) {
        $query = "SELECT * FROM " . $this->table . " WHERE user_id = :user_id AND is_active = 1 ORDER BY name ASC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id, $userId) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id AND user_id = :user_id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($userId, $data) {
        $query = "INSERT INTO " . $this->table . " (user_id, name, address, type) VALUES (:user_id, :name, :address, :type)";
        $stmt = $this->db->prepare($query);
        
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':address', $data['address']);
        $stmt->bindParam(':type', $data['type']);

        if ($stmt->execute()) {
            return $this->db->lastInsertId();
        }
        return false;
    }

    public function update($id, $userId, $data) {
        $query = "UPDATE " . $this->table . " SET name = :name, address = :address, type = :type, is_active = :is_active WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($query);

        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':address', $data['address']);
        $stmt->bindParam(':type', $data['type']);
        $stmt->bindParam(':is_active', $data['is_active']);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $userId);

        return $stmt->execute();
    }

    public function delete($id, $userId) {
        // Soft delete by setting is_active = 0
        $query = "UPDATE " . $this->table . " SET is_active = 0 WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $userId);
        return $stmt->execute();
    }
}
?>
