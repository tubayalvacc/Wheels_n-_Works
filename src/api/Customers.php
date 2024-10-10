<?php
// Include necessary files and libraries
// Adjust the path as necessary
require_once '../config/database.php'; // Adjust the path as necessary
require_once '../utils/functions.php'; // Adjust the path as necessary

// Set headers for CORS and content type
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Origin, Accept, Authorization, X-Requested-With");
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle OPTIONS method for preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

class Customers {
    private $conn;
    private $table_name = "Customers"; // Name of your customers table

    public function __construct($db) {
        $this->conn = $db;
    }

    public function fetchCustomer($CustomerID) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE CustomerID = :CustomerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':CustomerID', $CustomerID);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function createCustomer($Email, $Password, $ContactNumber, $NameSurname, $Address, $CarPlateNumber) {
        $query = "INSERT INTO " . $this->table_name . " (Email, password, ContactNumber, NameSurname, Address, CarPlateNumber) 
                  VALUES (:Email, :Password, :ContactNumber, :NameSurname, :Address, :CarPlateNumber)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':Email', $Email);
        $stmt->bindParam(':Password', password_hash($Password, PASSWORD_BCRYPT)); // Hashing the password
        $stmt->bindParam(':ContactNumber', $ContactNumber);
        $stmt->bindParam(':NameSurname', $NameSurname);
        $stmt->bindParam(':Address', $Address);
        $stmt->bindParam(':CarPlateNumber', $CarPlateNumber);

        if ($stmt->execute()) {
            return ["success" => true, "message" => "Customer created successfully."];
        } else {
            return ["success" => false, "message" => "Failed to create customer."];
        }
    }

    public function updateCustomer($CustomerID, $Email, $ContactNumber, $NameSurname, $Address, $CarPlateNumber) {
        $query = "UPDATE " . $this->table_name . " 
                  SET Email = :Email, ContactNumber = :ContactNumber, NameSurname = :NameSurname, Address = :Address, CarPlateNumber = :CarPlateNumber 
                  WHERE CustomerID = :CustomerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':Email', $Email);
        $stmt->bindParam(':ContactNumber', $ContactNumber);
        $stmt->bindParam(':NameSurname', $NameSurname);
        $stmt->bindParam(':Address', $Address);
        $stmt->bindParam(':CarPlateNumber', $CarPlateNumber);
        $stmt->bindParam(':CustomerID', $CustomerID);

        if ($stmt->execute()) {
            return ["success" => true, "message" => "Customer updated successfully."];
        } else {
            return ["success" => false, "message" => "Failed to update customer."];
        }
    }

    public function deleteCustomer($CustomerID) {
        $query = "DELETE FROM " . $this->table_name . " WHERE CustomerID = :CustomerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':CustomerID', $CustomerID);

        if ($stmt->execute()) {
            return ["success" => true, "message" => "Customer deleted successfully."];
        } else {
            return ["success" => false, "message" => "Failed to delete customer."];
        }
    }
}

// Instantiate database and customers object
$database = new Database();
$db = $database->getConnection();

$customers = new Customers($db);

// Process the request
$requestMethod = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

switch ($requestMethod) {
    case 'GET':
        // Fetch customer details
        if (isset($_GET['CustomerID'])) {
            $response = $customers->fetchCustomer($_GET['CustomerID']);
        } else {
            $response = ["success" => false, "message" => "CustomerID is required."];
        }
        break;

    case 'POST':
        // Create a new customer
        if (isset($data['Email'], $data['Password'], $data['ContactNumber'], $data['NameSurname'], $data['Address'], $data['CarPlateNumber'])) {
            $response = $customers->createCustomer(
                $data['Email'],
                $data['Password'],
                $data['ContactNumber'],
                $data['NameSurname'],
                $data['Address'],
                $data['CarPlateNumber']
            );
        } else {
            $response = ["success" => false, "message" => "Invalid input."];
        }
        break;

    case 'PUT':
        // Update customer details
        if (isset($data['CustomerID'], $data['Email'], $data['ContactNumber'], $data['NameSurname'], $data['Address'], $data['CarPlateNumber'])) {
            $response = $customers->updateCustomer(
                $data['CustomerID'],
                $data['Email'],
                $data['ContactNumber'],
                $data['NameSurname'],
                $data['Address'],
                $data['CarPlateNumber']
            );
        } else {
            $response = ["success" => false, "message" => "Invalid input."];
        }
        break;

    case 'DELETE':
        // Delete a customer
        if (isset($data['CustomerID'])) {
            $response = $customers->deleteCustomer($data['CustomerID']);
        } else {
            $response = ["success" => false, "message" => "CustomerID is required."];
        }
        break;

    default:
        $response = ["success" => false, "message" => "Request method not allowed."];
        break;
}

// Output the response
echo json_encode($response);
