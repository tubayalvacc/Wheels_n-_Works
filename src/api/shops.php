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

class Shops {
    private $conn;
    private $table_name = "Shops";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " (ShopName, Location, ContactNumber, Email) 
                  VALUES (:shopName, :location, :contactNumber, :email)";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':shopName', $data['ShopName']);
        $stmt->bindParam(':location', $data['Location']);
        $stmt->bindParam(':contactNumber', $data['ContactNumber']);
        $stmt->bindParam(':email', $data['Email']);

        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Shop creation failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }

    public function read($id = null) {
        $query = "SELECT * FROM " . $this->table_name;
        if ($id) {
            $query .= " WHERE ShopID = :shopID";
        }
        $stmt = $this->conn->prepare($query);

        if ($id) {
            $stmt->bindParam(':shopID', $id);
        }
        $stmt->execute();

        return $id ? $stmt->fetch(PDO::FETCH_ASSOC) : $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function update($id, $data) {
        $query = "UPDATE " . $this->table_name . " SET 
              ShopName = :shopName, 
              Location = :location, 
              ContactNumber = :contactNumber, 
              Email = :email
              WHERE ShopID = :shopID";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':shopName', $data['ShopName']);
        $stmt->bindParam(':location', $data['Location']);
        $stmt->bindParam(':contactNumber', $data['ContactNumber']);
        $stmt->bindParam(':email', $data['Email']);
        $stmt->bindParam(':shopID', $id);

        // Debugging line: print SQL query and parameters
        error_log($query);
        error_log(print_r($data, true));

        if ($stmt->execute()) {
            return true;
        } else {
            // Debugging line: print error info
            error_log(print_r($stmt->errorInfo(), true));
            echo json_encode(["message" => "Shop update failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }


    public function delete($id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE ShopID = :shopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':shopID', $id);

        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Shop deletion failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$shops = new Shops($db);

// Handle request
$request = json_decode(file_get_contents("php://input"), true);
$shopID = isset($_GET['shopID']) ? $_GET['shopID'] : '';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        $data = [
            'ShopName' => validateInput($_POST['ShopName']),
            'Location' => validateInput($_POST['Location']),
            'ContactNumber' => validateInput($_POST['ContactNumber']),
            'Email' => validateInput($_POST['Email'])
        ];
        if ($shops->create($data)) {
            echo json_encode(["message" => "Shop created successfully!"]);
        } else {
            echo json_encode(["message" => "Shop creation failed!"]);
        }
        break;
    case 'GET':
        if ($shopID) {
            echo json_encode($shops->read($shopID));
        } else {
            echo json_encode($shops->read());
        }
        break;
    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);

        // Debugging line: print received data
        error_log(print_r($data, true));

        if (json_last_error() === JSON_ERROR_NONE) {
            $id = isset($data['ShopID']) ? validateInput($data['ShopID']) : null;
            $updateData = [
                'ShopName' => isset($data['ShopName']) ? validateInput($data['ShopName']) : null,
                'Location' => isset($data['Location']) ? validateInput($data['Location']) : null,
                'ContactNumber' => isset($data['ContactNumber']) ? validateInput($data['ContactNumber']) : null,
                'Email' => isset($data['Email']) ? validateInput($data['Email']) : null
            ];

            // Debugging line: print sanitized data
            error_log(print_r($updateData, true));

            if ($shops->update($id, $updateData)) {
                echo json_encode(["message" => "Shop updated successfully!"]);
            } else {
                echo json_encode(["message" => "Shop update failed!"]);
            }
        } else {
            echo json_encode(["message" => "Invalid JSON input"]);
        }
        break;


    case 'DELETE':
        $id = validateInput($shopID);
        if ($shops->delete($id)) {
            echo json_encode(["message" => "Shop deleted successfully!"]);
        } else {
            echo json_encode(["message" => "Shop deletion failed!"]);
        }
        break;
}
