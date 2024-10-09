<?php

require_once '../config/database.php';
require_once '../utils/functions.php';

// Allow requests from any origin (for development purposes)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

// Set content type to JSON
header('Content-Type: application/json');

// Enable error reporting for development (disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class Services
{
    private $conn;
    private $table_name = "Services"; // Make sure this matches the actual table name

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getServiceDetail()
    {
        // Query to fetch service details
        $sql = "SELECT ServiceCode, ServiceName FROM " . $this->table_name;
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();

        $services = [];
        if ($stmt->rowCount() > 0) {
            // Fetch each row as an associative array
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $services[] = $row;
            }
        } else {
            // Optional: Add a default entry if no services are found
            $services[] = ['ServiceCode' => '', 'ServiceName' => 'No services available'];
        }

        return $services;
    }
}

// Create a new database connection
$database = new Database(); // Ensure this class is properly defined in ../config/database.php
$db = $database->getConnection();

// Check if the connection was successful
if ($db === null) {
    echo json_encode(['error' => 'Database connection failed.']);
    exit();
}

// Create a new Services instance and fetch service details
$services = new Services($db);
$serviceDetails = $services->getServiceDetail();

// Output the service details as JSON
echo json_encode($serviceDetails);
