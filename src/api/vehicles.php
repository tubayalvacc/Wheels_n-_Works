<?php
// AUTHOR-MADE BY TUĞBA YALVAÇ MOHAMMED

// Include the necessary files for database connection and utility functions
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


// Define the Vehicles class for managing vehicles in the database
class Vehicles {
    private $conn;
    private $table_name = "vehicles";

    // Constructor to initialize the database connection
    public function __construct($db) {
        $this->conn = $db;
    }

    // Method to create a new vehicle
    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " (Make, Model, Year, CustomerID) VALUES (:make, :model, :year, :customerID)";
        $stmt = $this->conn->prepare($query);

        // Bind parameters to the prepared statement
        $stmt->bindParam(':make', $data['make']);
        $stmt->bindParam(':model', $data['model']);
        $stmt->bindParam(':year', $data['year']);
        $stmt->bindParam(':customerID', $data['customerID']);

        // Execute the query and return true if successful, otherwise return false with an error message
        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Vehicle creation failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }

    // Method to read all vehicles
    public function read() {
        $query = "SELECT * FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        // Fetch all results as an associative array
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Method to update an existing vehicle
    public function update($id, $data) {
        $query = "UPDATE " . $this->table_name . " SET Make = :make, Model = :model, Year = :year, CustomerID = :customerID WHERE VehicleID = :id";
        $stmt = $this->conn->prepare($query);

        // Bind parameters to the prepared statement
        $stmt->bindParam(':make', $data['make']);
        $stmt->bindParam(':model', $data['model']);
        $stmt->bindParam(':year', $data['year']);
        $stmt->bindParam(':customerID', $data['customerID']);
        $stmt->bindParam(':id', $id);

        // Execute the query and return true if successful, otherwise return false with an error message
        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Vehicle update failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }

    // Method to delete a vehicle
    public function delete($id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE VehicleID = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);

        // Execute the query and return true if successful, otherwise return false with an error message
        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Vehicle deletion failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }
}

// Instantiate Database and Vehicles classes
$database = new Database(); // Create a new instance of the Database class
$db = $database->getConnection(); // Get the database connection
$vehicles = new Vehicles($db); // Create a new instance of the Vehicles class with the database connection

// Handle request
header('Content-Type: application/json'); // Set the content type of the response to JSON

// Decode the JSON request body into a PHP array
$request = json_decode(file_get_contents("php://input"), true);

// Process different HTTP methods
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = [
        'make' => validateInput($request['make']),
        'model' => validateInput($request['model']),
        'year' => intval(validateInput($request['year'])),
        'customerID' => intval(validateInput($request['customerID']))
    ];

    // Attempt to create the vehicle and return a success or failure message
    if ($vehicles->create($data)) {
        echo json_encode(["message" => "Vehicle created successfully!"]);
    } else {
        echo json_encode(["message" => "Vehicle creation failed!"]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // If the request method is GET, retrieve and return all vehicles
    echo json_encode($vehicles->read());
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    parse_str(file_get_contents("php://input"), $put_vars);
    $id = validateInput($put_vars['VehicleID']);
    $data = [
        'make' => validateInput($put_vars['make']),
        'model' => validateInput($put_vars['model']),
        'year' => intval(validateInput($put_vars['year'])),
        'customerID' => intval(validateInput($put_vars['customerID']))
    ];

    // Attempt to update the vehicle and return a success or failure message
    if ($vehicles->update($id, $data)) {
        echo json_encode(["message" => "Vehicle updated successfully!"]);
    } else {
        echo json_encode(["message" => "Vehicle update failed!"]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(file_get_contents("php://input"), $delete_vars);
    $id = validateInput($delete_vars['VehicleID']);

    // Attempt to delete the vehicle and return a success or failure message
    if ($vehicles->delete($id)) {
        echo json_encode(["message" => "Vehicle deleted successfully!"]);
    } else {
        echo json_encode(["message" => "Vehicle deletion failed!"]);
    }
}
