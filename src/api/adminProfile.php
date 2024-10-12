<?php
// Include necessary files and libraries
require_once '../config/database.php'; // Adjust path if necessary

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle OPTIONS method for preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

class Profile {
    private $conn;
    private $owner_table = "ShopOwner";
    private $shop_table = "Shops";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getProfileDetails($owner_id) {
        // Fetch user details
        $query = "SELECT * FROM " . $this->owner_table . " WHERE OwnerID = :owner_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':owner_id', $owner_id);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        // If user not found, return an error response
        if (!$user) {
            return ['message' => 'User not found'];
        }

        // Fetch shop details
        $query = "SELECT * FROM " . $this->shop_table . " WHERE ShopID = :shop_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':shop_id', $user['ShopID']);
        $stmt->execute();
        $shop = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        return [
            'user' => $user,
            'shop' => $shop
        ];
    }

    public function updateProfileDetails($owner_id, $user_data, $shop_data) {
        // Update user details
        $query = "UPDATE " . $this->owner_table . " SET Name = :name, ContactInfo = :contactInfo, Username = :username, Email = :email WHERE OwnerID = :owner_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':name', $user_data['Name']);
        $stmt->bindParam(':contactInfo', $user_data['ContactInfo']);
        $stmt->bindParam(':username', $user_data['Username']);
        $stmt->bindParam(':email', $user_data['Email']);
        $stmt->bindParam(':owner_id', $owner_id);
        $stmt->execute();

        // Update shop details
        $query = "UPDATE " . $this->shop_table . " SET ShopName = :shopName, Location = :location, ContactNumber = :contactNumber, Email = :email WHERE ShopID = :shop_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':shopName', $shop_data['ShopName']);
        $stmt->bindParam(':location', $shop_data['Location']);
        $stmt->bindParam(':contactNumber', $shop_data['ContactNumber']);
        $stmt->bindParam(':email', $shop_data['Email']);
        $stmt->bindParam(':shop_id', $user_data['ShopID']);
        $stmt->execute();

        return ['message' => 'Profile updated successfully'];
    }
}

// Create Database and Profile object
$database = new Database();
$db = $database->getConnection();
$profile = new Profile($db);

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['owner_id'])) {
    $owner_id = $_GET['owner_id'];
    $data = $profile->getProfileDetails($owner_id);

    if (!$data || empty($data['user'])) {
        echo json_encode(['error' => 'Profile not found or empty data']);
        exit;
    }

    echo json_encode($data);
}


// Handle PUT request
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Parse input JSON data
    $input = json_decode(file_get_contents("php://input"), true);
    $owner_id = $input['owner_id'];
    $user_data = $input['user'];
    $shop_data = $input['shop'];

    $response = $profile->updateProfileDetails($owner_id, $user_data, $shop_data);
    echo json_encode($response);
}
