<?php
ini_set('display_errors', 1);
ini_set('display_errors', '0');
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../config/database.php';
require_once '../utils/functions.php';


header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, DELETE, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}


class ShopOwner {
    private $conn;
    private $table_name = "ShopOwners";
    private $table_name2 = "Shops";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getProfile($ownerID) {
        $query = "SELECT o.OwnerID, o.Name, o.ContactInfo, o.ShopID, o.Username, o.email, s.ShopName, s.Location
              FROM " . $this->table_name . " o
              LEFT JOIN " . $this->table_name2 . " s ON o.ShopID = s.ShopID
              WHERE o.OwnerID = :ownerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ownerID', $ownerID);

        if (!$stmt->execute()) {
            throw new Exception("Error executing query: " . implode(", ", $stmt->errorInfo()));
        }

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$result) {
            return null;
        }
        return $result;
    }


    public function updateProfile($ownerID, $name, $contactInfo, $username, $email, $password = null) {
        $query = "UPDATE " . $this->table_name . " SET 
                  Name = :name, 
                  ContactInfo = :contactInfo, 
                  Username = :username, 
                  email = :email";

        if ($password) {
            $query .= ", Password = :password";
        }

        $query .= " WHERE OwnerID = :ownerID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':contactInfo', $contactInfo);
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':ownerID', $ownerID);

        if ($password) {
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $stmt->bindParam(':password', $hashed_password);
        }

        return $stmt->execute();
    }

    public function deleteProfile($ownerID) {
        $query = "DELETE FROM " . $this->table_name . " WHERE OwnerID = :ownerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ownerID', $ownerID);
        return $stmt->execute();
    }
}

$database = new Database();
$db = $database->getConnection();
$shopOwner = new ShopOwner($db);

$headers = getallheaders();
$ownerID = isset($headers['Authorization']) ? str_replace('OwnerID ', '', $headers['Authorization']) : '';

if (empty($ownerID)) {
    http_response_code(401);
    echo json_encode(['message' => 'OwnerID is required.']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $profile = $shopOwner->getProfile($ownerID);
        if ($profile) {
            echo json_encode($profile);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Profile not found"]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["message" => $e->getMessage()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Use ternary operator for backward compatibility
    $name = isset($input['Name']) ? filter_var($input['Name'], FILTER_SANITIZE_STRING) : '';
    $contactInfo = isset($input['ContactInfo']) ? filter_var($input['ContactInfo'], FILTER_SANITIZE_STRING) : '';
    $username = isset($input['Username']) ? filter_var($input['Username'], FILTER_SANITIZE_STRING) : '';
    $email = isset($input['email']) ? filter_var($input['email'], FILTER_VALIDATE_EMAIL) : '';
    $password = isset($input['Password']) ? $input['Password'] : null;

    if (!$name || !$contactInfo || !$username || !$email) {
        http_response_code(400);
        echo json_encode(["message" => "Name, ContactInfo, Username, and Email are required and must be valid"]);
        exit();
    }

    try {
        if ($shopOwner->updateProfile($ownerID, $name, $contactInfo, $username, $email, $password)) {
            echo json_encode(["message" => "Profile updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update profile"]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["message" => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if ($shopOwner->deleteProfile($ownerID)) {
        echo json_encode(["message" => "Profile deleted successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Failed to delete profile"]);
    }
}
