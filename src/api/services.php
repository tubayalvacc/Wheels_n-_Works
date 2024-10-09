<?php
//AUTHOR-MADE BY TUĞBA YALVAÇ MOHAMMED

// Allow requests from any origin (for development purposes)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");


// Include the database configuration file and utility functions
require_once '../config/database.php';
require_once '../utils/functions.php';

// Define the Services class for managing services in the database
class Services {
    // Declare private variables to store database connection and table name
    private $conn;
    private $table_name = "services";

    // Constructor method to initialize the database connection
    public function __construct($db) {
        $this->conn = $db;
    }

    // Method to create a new service
    public function create($data) {
        // SQL query to insert a new service into the 'services' table
        $query = "INSERT INTO " . $this->table_name . " (ServiceName, Description, Cost) VALUES (:ServiceName, :Description, :Cost)";
        $stmt = $this->conn->prepare($query);

        // Bind parameters to the prepared statement
        $stmt->bindParam(':ServiceName', $data['ServiceName']);
        $stmt->bindParam(':Description', $data['Description']);
        $stmt->bindParam(':Cost', $data['Cost']);

        // Execute the query and return true if successful, otherwise return false with an error message
        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Service creation failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }

    // Method to read all services
    public function read() {
        // SQL query to select all records from the 'services' table
        $query = "SELECT * FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        // Fetch all results as an associative array and return them
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Method to update an existing service
    public function update($id, $data) {
        // SQL query to update a specific service record
        $query = "UPDATE " . $this->table_name . " SET ServiceName = :ServiceName, Description = :Description, Cost = :Cost WHERE ServiceID = :ServiceID";
        $stmt = $this->conn->prepare($query);

        // Bind parameters to the prepared statement
        $stmt->bindParam(':ServiceName', $data['ServiceName']);
        $stmt->bindParam(':Description', $data['Description']);
        $stmt->bindParam(':Cost', $data['Cost']);
        $stmt->bindParam(':ServiceID', $id);

        // Execute the query and return true if successful, otherwise return false with an error message
        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Service update failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }


    // Method to delete a service
    public function delete($id) {
        // SQL query to delete a specific service record
        $query = "DELETE FROM " . $this->table_name . " WHERE ServiceID = :ServiceID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ServiceID', $id);

        // Execute the query and return true if successful, otherwise return false with an error message
        if ($stmt->execute()) {
            return true;
        } else {
            echo json_encode(["message" => "Service deletion failed!", "error" => $stmt->errorInfo()]);
            return false;
        }
    }
}

// Instantiate Database and Services classes
$database = new Database();
$db = $database->getConnection();
$services = new Services($db);

// Handle request
header('Content-Type: application/json');
$request = json_decode(file_get_contents("php://input"));

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Retrieve service details from the request and validate input
    $data = [
        'ServiceName' => validateInput($_POST['ServiceName']),
        'Description' => validateInput($_POST['Description']),
        'Cost' => validateInput($_POST['Cost'])
    ];

    // Convert cost to a float to ensure it's a valid decimal number
    $data['Cost'] = floatval($data['Cost']);

    // Attempt to create the service and return a success or failure message
    if ($services->create($data)) {
        echo json_encode(["message" => "Service created successfully!"]);
    } else {
        echo json_encode(["message" => "Service creation failed!"]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // If the request method is GET, retrieve and return all services
    echo json_encode($services->read());
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Parse the PUT request data
    parse_str(file_get_contents("php://input"), $_PUT);
    // Retrieve and validate the service ID and details from the request
    $id = validateInput($_PUT['ServiceID']);
    $data = [
        'ServiceName' => validateInput($_PUT['ServiceName']),
        'Description' => validateInput($_PUT['Description']),
        'Cost' => validateInput($_PUT['Cost'])
    ];

    // Convert cost to a float to ensure it's a valid decimal number
    $data['Cost'] = floatval($data['Cost']);

    if ($services->update($id, $data)) {
        echo json_encode(["message" => "Service updated successfully!"]);
    } else {
        echo json_encode(["message" => "Service update failed!"]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Parse the DELETE request data
    parse_str(file_get_contents("php://input"), $_DELETE);
    // Retrieve and validate the service ID from the request
    $id = validateInput($_DELETE['ServiceID']);
    // Attempt to delete the service and return a success or failure message
    if ($services->delete($id)) {
        echo json_encode(["message" => "Service deleted successfully!"]);
    } else {
        echo json_encode(["message" => "Service deletion failed!"]);
    }
}
