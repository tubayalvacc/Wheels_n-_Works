<?php
require_once '../config/database.php';
require_once '../utils/functions.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// Define the class to handle shop details
class Shops {
    private $conn;
    private $table_name = "Shops";

    // Constructor to initialize database connection
    public function __construct($db) {
        $this->conn = $db;
    }

    // Method to get shop details by shop ID
    public function getShopDetails($shopId) {
        // Prepare the SQL statement with a placeholder for shop ID
        $sql = "SELECT ShopName, Location, ContactNumber, Email FROM " . $this->table_name . " WHERE ShopID = :shopId";
        $stmt = $this->conn->prepare($sql);

        // Bind the shop ID parameter
        $stmt->bindValue(':shopId', $shopId, PDO::PARAM_INT);

        // Execute the statement
        if ($stmt->execute()) {
            $shopDetails = $stmt->fetch(PDO::FETCH_ASSOC);

            // Output the shop details as JSON
            echo json_encode($shopDetails);
        } else {
            // Output error message if query execution fails
            echo json_encode(["message" => "Unable to fetch shop details."]);
        }
    }

    // Method to list all shops
    public function listAllShops() {
        // Prepare the SQL statement to select all shops
        $sql = "SELECT ShopID, ShopName, Location, ContactNumber, Email FROM " . $this->table_name;
        $stmt = $this->conn->prepare($sql);

        // Execute the statement
        if ($stmt->execute()) {
            $shops = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Output the list of all shops as JSON
            echo json_encode($shops);
        } else {
            // Output error message if query execution fails
            echo json_encode(["message" => "Unable to fetch shop list."]);
        }
    }
}

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Create Shops object
$shops = new Shops($db);

// Get request type and shop ID from query parameters
$shopId = isset($_GET['shopId']) ? intval($_GET['shopId']) : 0;
$requestType = $_SERVER['REQUEST_METHOD'];

if ($requestType == 'GET') {
    if ($shopId) {
        // Fetch and output shop details
        $shops->getShopDetails($shopId);
    } else {
        // Fetch and output list of all shops
        $shops->listAllShops();
    }
} else {
    echo json_encode(["message" => "Invalid request method."]);
}
