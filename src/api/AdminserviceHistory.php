<?php
// AUTHOR-MADE BY TUĞBA YALVAÇ MOHAMMED

// Include the database configuration file and utility functions
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

// Instantiate Database class and get the connection
$database = new Database();
$db = $database->getConnection();

// Get the ShopID from the URL
$ShopID = isset($_GET['shopId']) ? $_GET['shopId'] : null;

// Define the ServiceHistory class
class ServiceHistory {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getServicesByShop($ShopID) {
        if (!$ShopID) {
            return ["message" => "ShopID is required in the URL."];
        }

        $query = "SELECT ServiceCode, Description FROM Services WHERE ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ShopID', $ShopID);

        if ($stmt->execute()) {
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $services;
        } else {
            $errorInfo = $stmt->errorInfo();
            return ["message" => "Query failed. Error code: " . $errorInfo[1]];
        }
    }
}

// Instantiate ServiceHistory class
$serviceHistory = new ServiceHistory($db);

// Get the services for the given ShopID
$response = $serviceHistory->getServicesByShop($ShopID);

// Return the JSON response
echo json_encode($response);
