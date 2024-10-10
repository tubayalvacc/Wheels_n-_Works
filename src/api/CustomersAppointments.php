<?php
// Include necessary files and set headers
require_once 'mail_appointments.php';
require_once '../config/database.php';
require_once '../utils/functions.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Enable error reporting for development (disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class AppointmentAPI
{
    private $conn;
    private $table_name = "Appointment";
    private $table_name2 = "Customers";
    private $table_name3 = "Services";
    private $table_name4 = "Shops";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    private function getCustomerDetails($CustomerID) {
        $query = "SELECT CustomerID, email as CustomerEmail, NameSurname as CustomerName, CarPlateNumber 
                  FROM " . $this->table_name2 . " 
                  WHERE CustomerID = :CustomerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':CustomerID', $CustomerID);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getServiceDetails($ServiceCode) {
        $query = "SELECT ServiceCode, ServiceName, Cost 
                  FROM " . $this->table_name3 . " 
                  WHERE ServiceCode = :ServiceCode";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ServiceCode', $ServiceCode);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getShopDetails($ShopID) {
        $query = "SELECT ShopID, ShopName 
                  FROM " . $this->table_name4 . " 
                  WHERE ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ShopID', $ShopID);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($CustomerID, $Date, $Time, $ServiceCode, $ShopID)
    {
        $rollbackOccurred = false; // Flag to track rollback

        try {
            $this->conn->beginTransaction();

            // Check if the slot is already booked
            $checkQuery = "SELECT * FROM " . $this->table_name . " 
            WHERE ShopID = :ShopID AND Date = :Date AND Time = :Time";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':ShopID', $ShopID);
            $checkStmt->bindParam(':Date', $Date);
            $checkStmt->bindParam(':Time', $Time);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                $rollbackOccurred = true; // Mark rollback occurred
                $this->conn->rollBack();
                return ["success" => false, "message" => "This time slot is already booked."];
            }

            // Fetch customer details
            $customerDetails = $this->getCustomerDetails($CustomerID);
            if (!$customerDetails) {
                $rollbackOccurred = true;
                $this->conn->rollBack();
                return ["success" => false, "message" => "Customer not found."];
            }

            // Fetch service details
            $serviceDetails = $this->getServiceDetails($ServiceCode);
            if (!$serviceDetails) {
                $rollbackOccurred = true;
                $this->conn->rollBack();
                return ["success" => false, "message" => "Service not found."];
            }

            // Fetch shop details
            $shopDetails = $this->getShopDetails($ShopID);
            if (!$shopDetails) {
                $rollbackOccurred = true;
                $this->conn->rollBack();
                return ["success" => false, "message" => "Shop not found."];
            }

            // Insert the appointment
            $query = "INSERT INTO " . $this->table_name . " 
            (CustomerID, Date, Time, ServiceCode, ShopID, CarPlateNumber, CustomerEmail, ServiceDetails, CustomerName) 
            VALUES (:CustomerID, :Date, :Time, :ServiceCode, :ShopID, :CarPlateNumber, :CustomerEmail, :ServiceDetails, :CustomerName)";
            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(':CustomerID', $CustomerID);
            $stmt->bindParam(':Date', $Date);
            $stmt->bindParam(':Time', $Time);
            $stmt->bindParam(':ServiceCode', $ServiceCode);
            $stmt->bindParam(':ShopID', $ShopID);
            $stmt->bindParam(':CarPlateNumber', $customerDetails['CarPlateNumber']);
            $stmt->bindParam(':CustomerEmail', $customerDetails['CustomerEmail']);
            $stmt->bindParam(':ServiceDetails', $serviceDetails['ServiceName']);
            $stmt->bindParam(':CustomerName', $customerDetails['CustomerName']);

            // Execute the statement
            if ($stmt->execute()) {
                $appointmentID = $this->conn->lastInsertId();

                // Commit the transaction
                $this->conn->commit();

                // Send email notification
                $mailSender = new MailSender($this->conn);
                $emailData = [
                    'appointmentID' => $appointmentID,
                    'customer_name' => $customerDetails['CustomerName'],
                    'customer_id' => $CustomerID,
                    'date' => $Date,
                    'time' => $Time,
                    'service_code' => $ServiceCode,
                    'service_details' => $serviceDetails['ServiceName'],
                    'car_plate_number' => $customerDetails['CarPlateNumber'],
                    'customer_email' => $customerDetails['CustomerEmail']
                ];

                $emailResult = $mailSender->sendMail($emailData);

                return [
                    "success" => $emailResult['status'] === 'success',
                    "message" => $emailResult['status'] === 'success' ?
                        "Appointment created successfully and email sent!" :
                        "Appointment created but failed to send email.",
                    "data" => [
                        "appointmentID" => $appointmentID,
                        "customerName" => $customerDetails['CustomerName'],
                        "shopName" => $shopDetails['ShopName'],
                        "serviceName" => $serviceDetails['ServiceName'],
                        "date" => $Date,
                        "time" => $Time
                    ]
                ];
            } else {
                $rollbackOccurred = true; // Mark rollback occurred
                $this->conn->rollBack();
                return ["success" => false, "message" => "Failed to create appointment."];
            }

        } catch (Exception $e) {
            // Rollback only if an active transaction exists
            if ($this->conn->inTransaction() && !$rollbackOccurred) {
                $this->conn->rollBack(); // Rollback only if it hasn't occurred
            }
            return ["success" => false, "message" => $e->getMessage()];
        }
    }



    public function update($AppointmentID, $CustomerID, $Date, $Time, $ServiceCode, $ShopID, $CarPlateNumber, $CustomerEmail, $CustomerName)
    {
        try {
            // Retrieve the service name
            $ServiceDetails = $this->getServiceDetails($ServiceCode);
            $ServiceName = $ServiceDetails ? $ServiceDetails['ServiceName'] : 'Unknown';

            $query = "UPDATE " . $this->table_name . " 
              SET CustomerID = :CustomerID, Date = :Date, Time = :Time, ServiceCode = :ServiceCode, 
                  ShopID = :ShopID, CarPlateNumber = :CarPlateNumber, CustomerEmail = :CustomerEmail, 
                  ServiceDetails = :ServiceDetails, CustomerName = :CustomerName
              WHERE AppointmentID = :AppointmentID";

            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(':AppointmentID', $AppointmentID);
            $stmt->bindParam(':CustomerID', $CustomerID);
            $stmt->bindParam(':Date', $Date);
            $stmt->bindParam(':Time', $Time);
            $stmt->bindParam(':ServiceCode', $ServiceCode);
            $stmt->bindParam(':ShopID', $ShopID);
            $stmt->bindParam(':CarPlateNumber', $CarPlateNumber);
            $stmt->bindParam(':CustomerEmail', $CustomerEmail);
            $stmt->bindParam(':ServiceDetails', $ServiceName); // Store only ServiceName
            $stmt->bindParam(':CustomerName', $CustomerName);

            if ($stmt->execute()) {
                // Send email notification
                $mailSender = new MailSender($this->conn);
                $emailData = [
                    'appointmentID' => $AppointmentID,
                    'customer_name' => $CustomerName,
                    'customer_id' => $CustomerID,
                    'date' => $Date,
                    'time' => $Time,
                    'service_code' => $ServiceCode,
                    'service_details' => $ServiceName, // Send only ServiceName
                    'car_plate_number' => $CarPlateNumber,
                    'customer_email' => $CustomerEmail
                ];

                $emailResult = $mailSender->sendMail($emailData);

                if ($emailResult['status'] === 'success') {
                    return ["success" => true, "message" => "Appointment updated successfully and email sent."];
                } else {
                    return ["success" => true, "message" => "Appointment updated successfully, but email sending failed: " . $emailResult['message']];
                }
            } else {
                return ["success" => false, "message" => "Failed to update appointment."];
            }
        } catch (Exception $e) {
            error_log("Exception: " . $e->getMessage());
            return ["success" => false, "message" => $e->getMessage()];
        }
    }



    public function delete($AppointmentID)
    {
        $query = "DELETE FROM " . $this->table_name . " WHERE AppointmentID = :AppointmentID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':AppointmentID', $AppointmentID);

        if ($stmt->execute()) {
            return ["success" => true, "message" => "Appointment deleted successfully."];
        } else {
            return ["success" => false, "message" => "Failed to delete appointment."];
        }
    }

    public function getAvailableSlots($ShopID, $Date)
    {
        $start_time = '08:00:00';
        $end_time = '19:00:00';
        $slot_duration = 30; // minutes

        // Generate all possible slots for the day
        $all_slots = [];
        $current_time = strtotime($start_time);
        $end_time = strtotime($end_time);

        while ($current_time < $end_time) {
            $all_slots[] = date('H:i:s', $current_time);
            $current_time += $slot_duration * 60;
        }

        // Fetch booked slots for the given ShopID and Date
        $query = "SELECT Time FROM " . $this->table_name . " WHERE ShopID = :ShopID AND Date = :Date";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ShopID', $ShopID);
        $stmt->bindParam(':Date', $Date);
        $stmt->execute();

        $booked_slots = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // Determine available and unavailable slots
        $available_slots = array_diff($all_slots, $booked_slots);
        $unavailable_slots = array_intersect($all_slots, $booked_slots);

        return [
            "success" => true,
            "message" => "Slots retrieved successfully.",
            "data" => [
                "available_slots" => array_values($available_slots),
                "unavailable_slots" => array_values($unavailable_slots)
            ]
        ];
    }


    public function getAppointmentsByCustomer($CustomerID)
    {
        $query = "SELECT * FROM " . $this->table_name . " WHERE CustomerID = :CustomerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':CustomerID', $CustomerID);
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            "success" => true,
            "message" => "Appointments retrieved successfully.",
            "data" => $appointments
        ];
    }
    public function getAllShops() {
        $query = "SELECT ShopID, ShopName, Location FROM $this->table_name4";
        $stmt = $this->conn->prepare($query);

        if ($stmt->execute()) {
            $shops = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return [
                "success" => true,
                "message" => "Shops retrieved successfully.",
                "data" => $shops
            ];
        } else {
            return [
                "success" => false,
                "message" => "Unable to fetch shop list."
            ];
        }
    }
    public function getAllServices()
    {
        $query = "SELECT ServiceCode, ServiceName, Cost FROM " . $this->table_name3;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            "success" => true,
            "message" => "Services retrieved successfully.",
            "data" => $services
        ];
    }
}

// Initialize database connection
$database = new Database();
$db = $database->getConnection();

// Initialize API
$api = new AppointmentAPI($db);

// Handle HTTP request method
$method = $_SERVER['REQUEST_METHOD'];
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';

switch ($method) {
    case 'POST':
        // Create new appointment
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['CustomerID'], $data['Date'], $data['Time'], $data['ServiceCode'], $data['ShopID'], $data['CarPlateNumber'])) {
            $CustomerID = $data['CustomerID'];
            $Date = $data['Date'];
            $Time = $data['Time'];
            $ServiceCode = $data['ServiceCode'];
            $ShopID = $data['ShopID'];
            $CarPlateNumber = $data['CarPlateNumber'];
            $CustomerEmail = isset($data['CustomerEmail']) ? $data['CustomerEmail'] : null;
            $CustomerName = isset($data['CustomerName']) ? $data['CustomerName'] : null;

            // Call the create method with all parameters
            $result = $api->create($CustomerID, $Date, $Time, $ServiceCode, $ShopID, $CarPlateNumber, $CustomerEmail, $CustomerName);
        } else {
            $result = ["success" => false, "message" => "Missing required parameters."];
        }
        break;

    case 'PUT':
        // Update existing appointment
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['AppointmentID'], $data['CustomerID'], $data['Date'], $data['Time'], $data['ServiceCode'], $data['ShopID'], $data['CarPlateNumber'], $data['CustomerEmail'], $data['CustomerName'])) {
            $result = $api->update($data['AppointmentID'], $data['CustomerID'], $data['Date'], $data['Time'], $data['ServiceCode'], $data['ShopID'], $data['CarPlateNumber'], $data['CustomerEmail'], $data['CustomerName']);
        } else {
            $result = ["success" => false, "message" => "Missing required parameters."];
        }
        break;

    case 'DELETE':
        // Delete appointment
        if (isset($_GET['AppointmentID'])) {
            $result = $api->delete($_GET['AppointmentID']);
        } else {
            $result = ["success" => false, "message" => "Missing required parameter: AppointmentID."];
        }
        break;

    case 'GET':
        if ($endpoint === 'available_slots') {
            // Get available slots
            if (isset($_GET['ShopID']) && isset($_GET['Date'])) {
                $result = $api->getAvailableSlots($_GET['ShopID'], $_GET['Date']);
            } else {
                $result = ["success" => false, "message" => "Missing required parameters: ShopID and Date."];
            }
        } elseif ($endpoint === 'appointments') {
            // Get appointments by customer
            if (isset($_GET['CustomerID'])) {
                $result = $api->getAppointmentsByCustomer($_GET['CustomerID']);
            } else {
                $result = ["success" => false, "message" => "Missing required parameter: CustomerID."];
            }
        } elseif ($endpoint === 'services') {
            // Get all services
            $result = $api->getAllServices();
        } else if ($endpoint === 'shops') {
            $result = $api->getAllShops();
        } else {
            $result = ["success" => false, "message" => "Invalid endpoint."];
        }
        break;

    default:
        $result = ["success" => false, "message" => "Method not allowed."];
        break;
}

echo json_encode($result);
