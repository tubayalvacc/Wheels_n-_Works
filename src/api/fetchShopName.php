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

// Handle OPTIONS method for preflight requests
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
    public function getShopDetailsByShopId($shopId) {
        $sql = "SELECT ShopName, Location, ContactNumber, Email FROM " . $this->table_name . " WHERE ShopID = :shopId";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindValue(':shopId', $shopId, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $shopDetails = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($shopDetails);
        } else {
            echo json_encode(["message" => "Unable to fetch shop details."]);
        }
    }

    // Method to get shop ID by appointment ID
    public function getShopIdByAppointmentId($appointmentId) {
        $sql = "SELECT ShopID FROM Appointment WHERE AppointmentID = :appointmentId";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindValue(':appointmentId', $appointmentId, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['ShopID'] ?? null;
        } else {
            echo json_encode(["message" => "Unable to fetch shop ID."]);
            return null;
        }
    }
}

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Create Shops object
$shops = new Shops($db);

// Get request type and parameters from query parameters
$appointmentId = isset($_GET['appointmentId']) ? intval($_GET['appointmentId']) : 0;
$requestType = $_SERVER['REQUEST_METHOD'];

if ($requestType == 'GET') {
    if ($appointmentId) {
        // Fetch shop ID using appointment ID
        $shopId = $shops->getShopIdByAppointmentId($appointmentId);
        if ($shopId) {
            // Fetch and output shop details using shop ID
            $shops->getShopDetailsByShopId($shopId);
        } else {
            echo json_encode(["message" => "No shop associated with this appointment."]);
        }
    } else {
        echo json_encode(["message" => "Appointment ID is required."]);
    }
} else {
    echo json_encode(["message" => "Invalid request method."]);
}
