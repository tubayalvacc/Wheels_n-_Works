<?php
// AUTHOR-MADE BY TUĞBA YALVAÇ MOHAMMED

// Include the database configuration file and utility functions
require_once '../config/database.php';
require_once '../utils/functions.php';

// Allow requests from any origin (for development purposes)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Set content type to JSON
header('Content-Type: application/json');

// Enable error reporting for development (disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class Auth {
    private $conn;
    private $table_name = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function register($name_surname, $email, $password, $contact_number) {
        // Check if email already exists
        $query = "SELECT COUNT(*) FROM " . $this->table_name . " WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();

        if ($stmt->fetchColumn() > 0) {
            return ["success" => false, "message" => "Email already exists!"];
        }

        // Insert new user
        $query = "INSERT INTO " . $this->table_name . " (email, password, contact_number, name_surname, created_at) VALUES (:email, :password, :contact_number, :name_surname, NOW())";
        $stmt = $this->conn->prepare($query);
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':contact_number', $contact_number);
        $stmt->bindParam(':name_surname', $name_surname);

        if ($stmt->execute()) {
            return ["success" => true, "message" => "User registered successfully!"];
        } else {
            // Capture and return error information
            $errorInfo = $stmt->errorInfo();
            return ["success" => false, "message" => "User registration failed!", "error" => $errorInfo];
        }
    }

    public function login($email, $password) {
        // Select user based on email
        $query = "SELECT * FROM " . $this->table_name . " WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Verify password
        if ($user && password_verify($password, $user['password'])) {
            unset($user['password']); // Remove password from the response
            return ["success" => true, "message" => "Login successful!", "user" => $user];
        } else {
            return ["success" => false, "message" => "Login failed!"];
        }
    }

    public function update($UserID, $name_surname, $email, $password, $contact_number) {
        // Update user details
        $query = "UPDATE " . $this->table_name . " SET name_surname = :name_surname, email = :email, password = :password, contact_number = :contact_number WHERE UserID = :UserID";
        $stmt = $this->conn->prepare($query);
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt->bindParam(':UserID', $UserID);
        $stmt->bindParam(':name_surname', $name_surname);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':contact_number', $contact_number);

        return $stmt->execute() ? ["success" => true, "message" => "User updated successfully!"] : ["success" => false, "message" => "User update failed!"];
    }

    public function delete($UserID) {
        // Delete user
        $query = "DELETE FROM " . $this->table_name . " WHERE UserID = :UserID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':UserID', $UserID);

        return $stmt->execute() ? ["success" => true, "message" => "User deleted successfully!"] : ["success" => false, "message" => "User deletion failed!"];
    }

    public function getById($UserID) {
        // Get user by ID
        $query = "SELECT UserID, name_surname, email, contact_number, created_at FROM " . $this->table_name . " WHERE UserID = :UserID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':UserID', $UserID);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getAll() {
        // Get all users
        $query = "SELECT UserID, name_surname, email, contact_number, created_at FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

// Instantiate Database and Auth classes
$database = new Database();
$db = $database->getConnection();
$auth = new Auth($db);

// Log request data for debugging
$request_method = $_SERVER['REQUEST_METHOD'];
$request_body = file_get_contents("php://input");
$request_data = json_decode($request_body, true);

error_log("Request Method: $request_method");
error_log("Request Body: $request_body");

// Handle request
switch ($request_method) {
    case 'OPTIONS':
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type");
        exit(0);
        break;

    case 'GET':
        if (isset($_GET['UserID'])) {
            // Get user by ID
            $UserID = $_GET['UserID'];
            $user = $auth->getById($UserID);
            echo json_encode($user ? ["success" => true, "user" => $user] : ["success" => false, "message" => "User not found!"]);
        } else {
            // Get all users
            $users = $auth->getAll();
            echo json_encode(["success" => true, "users" => $users]);
        }
        break;

    case 'POST':
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'register') {
            $name_surname = isset($request_data['name_surname']) ? $request_data['name_surname'] : '';
            $email = isset($request_data['email']) ? $request_data['email'] : '';
            $password = isset($request_data['password']) ? $request_data['password'] : '';
            $contact_number = isset($request_data['contact_number']) ? $request_data['contact_number'] : '';

            if (empty($name_surname) || empty($email) || empty($password) || empty($contact_number)) {
                echo json_encode(["success" => false, "message" => "All fields are required!"]);
                exit;
            }

            $result = $auth->register($name_surname, $email, $password, $contact_number);
            echo json_encode($result);
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

    case 'PUT':
        $UserID = isset($request_data['UserID']) ? $request_data['UserID'] : '';
        $name_surname = isset($request_data['name_surname']) ? $request_data['name_surname'] : '';
        $email = isset($request_data['email']) ? $request_data['email'] : '';
        $password = isset($request_data['password']) ? $request_data['password'] : '';
        $contact_number = isset($request_data['contact_number']) ? $request_data['contact_number'] : '';

        if (empty($UserID) || empty($name_surname) || empty($email) || empty($contact_number)) {
            echo json_encode(["success" => false, "message" => "All fields are required!"]);
            exit;
        }

        $result = $auth->update($UserID, $name_surname, $email, $password, $contact_number);
        echo json_encode($result);
        break;


    case 'DELETE':
        $UserID = isset($_GET['UserID']) ? $_GET['UserID'] : '';

        if (empty($UserID)) {
            echo json_encode(["success" => false, "message" => "UserID is required!"]);
            exit;
        }

        $result = $auth->delete($UserID);
        echo json_encode($result);
        break;

    default:
        echo json_encode(["success" => false, "message" => "Method not allowed!"]);
        break;
}
