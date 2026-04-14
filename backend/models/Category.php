<?php
// backend/models/Category.php

class Category {
    private $db;
    private $table = "categories";

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($userId) {
        // Return system categories (user_id IS NULL) + user specific categories
        $query = "SELECT * FROM " . $this->table . " WHERE user_id = :user_id OR user_id IS NULL ORDER BY id ASC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($userId, $data) {
        $query = "INSERT INTO " . $this->table . " (user_id, name, type, schedule_e_line, color) VALUES (:user_id, :name, :type, :schedule_e_line, :color)";
        $stmt = $this->db->prepare($query);
        
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':type', $data['type']);
        $stmt->bindParam(':schedule_e_line', $data['schedule_e_line']);
        $stmt->bindParam(':color', $data['color']);

        if ($stmt->execute()) {
            return $this->db->lastInsertId();
        }
        return false;
    }

    public function update($id, $userId, $data) {
        // Only user-owned categories can be updated (system categories have user_id IS NULL)
        $query = "UPDATE " . $this->table . " SET name = :name, type = :type, schedule_e_line = :schedule_e_line, color = :color WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':type', $data['type']);
        $stmt->bindParam(':schedule_e_line', $data['schedule_e_line']);
        $stmt->bindParam(':color', $data['color']);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $userId);
        return $stmt->execute();
    }

    public function delete($id, $userId) {
        // Only user-owned categories can be deleted
        $query = "DELETE FROM " . $this->table . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $userId);
        return $stmt->execute();
    }
}
?>
