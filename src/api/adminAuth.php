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
    private $owner_table = "ShopOwners";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function login($email, $password) {
        $query = "SELECT * FROM " . $this->owner_table . " WHERE Email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($admin && password_verify($password, $admin['Password'])) {
            unset($admin['Password']);
            return ["success" => true, "message" => "Login successful!", "admin" => $admin];
        } else {
            return ["success" => false, "message" => "Login failed! Please check your email and password."];
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

    error_log("Request Method: $request_method");
    error_log("Request Body: $request_body");
    error_log("Request Data: " . print_r($request_data, true));

    switch ($request_method) {
        case 'OPTIONS':
            // Handle CORS preflight requests
            http_response_code(200);
            exit;

        case 'POST':
            $action = isset($_GET['action']) ? $_GET['action'] : '';

            if ($action === 'register') {
                $username = isset($request_data['username']) ? $request_data['username'] : '';
                $email = isset($request_data['email']) ? $request_data['email'] : '';
                $password = isset($request_data['password']) ? $request_data['password'] : '';
                $confirm_password = isset($request_data['confirm_password']) ? $request_data['confirm_password'] : '';

                if (empty($username) || empty($email) || empty($password) || empty($confirm_password)) {
                    echo json_encode(["success" => false, "message" => "All fields are required!"]);
                    exit;
                }

                $result = $auth->register($username, $email, $password, $confirm_password);
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

        default:
            echo json_encode(["success" => false, "message" => "Invalid request method!"]);
            break;
    }
