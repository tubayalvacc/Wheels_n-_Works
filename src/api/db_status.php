<?php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$conn = $database->getConnection();

if ($conn) {
    echo json_encode(['status' => 'success', 'message' => 'Database connection successful!']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed!']);
}

