<?php
require_once '../config/database.php';
require_once '../utils/functions.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class AdminAuth {
    private $conn;
    private $owner_table = "ShopOwner";
    private $shop_table = "Shops";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function registerShop($shopName, $location, $contactNumber, $email) {
        $query = "INSERT INTO " . $this->shop_table . " (ShopName, Location, ContactNumber, Email) VALUES (:shopName, :location, :contactNumber, :email)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':shopName', $shopName);
        $stmt->bindParam(':location', $location);
        $stmt->bindParam(':contactNumber', $contactNumber);
        $stmt->bindParam(':email', $email);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function registerOwner($name, $contactInfo, $username, $password, $email, $shopID) {
        $hashed_password = password_hash($password, PASSWORD_BCRYPT);

        $query = "INSERT INTO " . $this->owner_table . " (Name, ContactInfo, Username, Password, Email, ShopID) VALUES (:name, :contactInfo, :username, :password, :email, :shopID)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':contactInfo', $contactInfo);
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':password', $hashed_password);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':shopID', $shopID);

        return $stmt->execute();
    }

    public function login($email, $password) {
        $query = "SELECT * FROM " . $this->owner_table . " WHERE Email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($admin && password_verify($password, $admin['Password'])) {
            unset($admin['Password']);

            // Since you already have the ShopID from the admin record, you can return it directly
            return [
                "success" => true,
                "message" => "Login successful!",
                "admin" => [
                    "OwnerID" => $admin['OwnerID'],
                    "ShopID" => $admin['ShopID'] // Directly using ShopID from the admin record
                ]
            ];
        } else {
            return [
                "success" => false,
                "message" => "Login failed! Please check your email and password."
            ];
        }
    }

}

// Initialize the database and auth class
$database = new Database();
$db = $database->getConnection();
$auth = new AdminAuth($db);

// Get the request method and body
$request_method = $_SERVER['REQUEST_METHOD'];
$request_body = file_get_contents("php://input");
$request_data = json_decode($request_body, true);

switch ($request_method) {
    case 'OPTIONS':
        http_response_code(200);
        exit;

    case 'POST':
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'register') {
            $shopName = isset($request_data['shopName']) ? $request_data['shopName'] : '';
            $location = isset($request_data['location']) ? $request_data['location'] : '';
            $contactNumber = isset($request_data['contactNumber']) ? $request_data['contactNumber'] : '';
            $shopEmail = isset($request_data['shopEmail']) ? $request_data['shopEmail'] : '';
            $ownerName = isset($request_data['ownerName']) ? $request_data['ownerName'] : '';
            $contactInfo = isset($request_data['contactInfo']) ? $request_data['contactInfo'] : '';
            $username = isset($request_data['username']) ? $request_data['username'] : '';
            $password = isset($request_data['password']) ? $request_data['password'] : '';
            $ownerEmail = isset($request_data['ownerEmail']) ? $request_data['ownerEmail'] : '';

            // Register Shop
            $shopID = $auth->registerShop($shopName, $location, $contactNumber, $shopEmail);
            if ($shopID) {
                // Register Shop Owner
                $ownerResult = $auth->registerOwner($ownerName, $contactInfo, $username, $password, $ownerEmail, $shopID);
                if ($ownerResult) {
                    echo json_encode(["success" => true, "message" => "Registration successful!"]);
                } else {
                    echo json_encode(["success" => false, "message" => "Failed to register owner."]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "Failed to register shop."]);
            }

        } elseif ($action === 'login') {
            $email = isset($request_data['email']) ? $request_data['email'] : '';
            $password = isset($request_data['password']) ? $request_data['password'] : '';

            if (empty($email) || empty($password)) {
                echo json_encode(["success" => false, "message" => "Both email and password are required!"]);
                exit;
            }

            $result = $auth->login($email, $password);
            echo json_encode($result);

        } else {
            echo json_encode(["success" => false, "message" => "Invalid action!"]);
        }
        break;

    default:
        echo json_encode(["success" => false, "message" => "Invalid request method!"]);
        break;
}
