<?php
// Include necessary files and libraries
require_once 'mail_appointments.php';
require_once '../config/database.php';
require_once '../utils/functions.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// Allow specific headers
header("Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization, X-Requested-With");
header('Content-Type: application/json');

// Handle OPTIONS method for preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

error_reporting(E_ALL);

class Appointments {
    private $conn;
    private $table_name = "Appointment";
    private $table_name3 = "Services";

    public function __construct($db) {
        $this->conn = $db;
    }

    private function getServiceDetails($ServiceCode) {
        $query = "SELECT Description FROM " . $this->table_name3 . " WHERE ServiceCode = :ServiceCode";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ServiceCode', $ServiceCode);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return isset($row['Description']) ? $row['Description'] : null;
    }

    public function getAvailableSlots($Date, $ShopID) {
        error_log("Getting available slots for date: " . $Date . " and ShopID: " . $ShopID);

        // Fetch booked slots
        $query = "SELECT Time FROM " . $this->table_name . " WHERE Date = :Date AND ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':Date', $Date);
        $stmt->bindParam(':ShopID', $ShopID);
        $stmt->execute();
        $bookedTimes = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

        // Normalize time format to H:i
        $bookedTimes = array_map(function($time) {
            return date('H:i', strtotime($time));
        }, $bookedTimes);

        $allTimes = $this->generateAllTimes();
        $availableSlots = array_diff($allTimes, $bookedTimes);

        return [
            'available_slots' => array_values($availableSlots),
            'unavailable_slots' => $bookedTimes
        ];
    }

    private function generateAllTimes() {
        $times = [];
        $start = new DateTime('08:00');
        $end = new DateTime('19:00');
        $interval = new DateInterval('PT30M');

        while ($start <= $end) {
            $times[] = $start->format('H:i');
            $start->add($interval);
        }

        return $times;
    }

    public function create($CustomerID, $Date, $Time, $ServiceCode, $ShopID, $CarPlateNumber, $CustomerEmail, $CustomerName) {
        $ServiceDetails = $this->getServiceDetails($ServiceCode);
        $availableSlots = $this->getAvailableSlots($Date, $ShopID)['available_slots'];

        if (!in_array($Time, $availableSlots)) {
            return ["success" => false, "message" => "Selected time slot is not available."];
        }

        $query = "INSERT INTO " . $this->table_name . " (CustomerID, Date, Time, ServiceCode, ShopID, CarPlateNumber, CustomerEmail, ServiceDetails, CustomerName) 
                  VALUES (:CustomerID, :Date, :Time, :ServiceCode, :ShopID, :CarPlateNumber, :CustomerEmail, :ServiceDetails, :CustomerName)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':CustomerID', $CustomerID);
        $stmt->bindParam(':Date', $Date);
        $stmt->bindParam(':Time', $Time);
        $stmt->bindParam(':ServiceCode', $ServiceCode);
        $stmt->bindParam(':ShopID', $ShopID);
        $stmt->bindParam(':CarPlateNumber', $CarPlateNumber);
        $stmt->bindParam(':CustomerEmail', $CustomerEmail);
        $stmt->bindParam(':ServiceDetails', $ServiceDetails);
        $stmt->bindParam(':CustomerName', $CustomerName);

        try {
            if ($stmt->execute()) {
                $appointmentID = $this->conn->lastInsertId();
                $mailSender = new MailSender($this->conn);
                $emailData = [
                    'appointmentID' => $appointmentID,
                    'customer_name' => $CustomerName,
                    'customer_id' => $CustomerID,
                    'date' => $Date,
                    'time' => $Time,
                    'service_code' => $ServiceCode,
                    'service_details' => $ServiceDetails,
                    'car_plate_number' => $CarPlateNumber,
                    'customer_email' => $CustomerEmail
                ];

                $emailResult = $mailSender->sendMail($emailData);
                if ($emailResult['status'] === 'success') {
                    return [
                        "success" => true,
                        "message" => "Appointment created successfully and email sent!",
                        "data" => ["appointmentID" => $appointmentID]
                    ];
                } else {
                    return [
                        "success" => true,
                        "message" => "Appointment created successfully, but email sending failed: " . $emailResult['message'],
                        "data" => ["appointmentID" => $appointmentID]
                    ];
                }
            } else {
                $errorInfo = $stmt->errorInfo();
                error_log("Database error: " . json_encode($errorInfo));
                return [
                    "success" => false,
                    "message" => "Appointment creation failed. Error code: " . $errorInfo[1]
                ];
            }
        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => $e->getMessage()
            ];
        }
    }

    public function update($ShopID, $AppointmentID, $CustomerID, $Date, $Time, $ServiceCode, $CarPlateNumber, $CustomerName, $CustomerEmail) {
        error_log("Update method called with parameters: " . json_encode(func_get_args()));

        // Input validation
        if (!$ShopID || !$AppointmentID || !$CustomerID || !$Date || !$Time || !$ServiceCode) {
            $missingFields = [];
            if (!$ShopID) $missingFields[] = 'ShopID';
            if (!$AppointmentID) $missingFields[] = 'AppointmentID';
            if (!$CustomerID) $missingFields[] = 'CustomerID';
            if (!$Date) $missingFields[] = 'Date';
            if (!$Time) $missingFields[] = 'Time';
            if (!$ServiceCode) $missingFields[] = 'ServiceCode';

            error_log("Missing required fields: " . implode(", ", $missingFields));
            return ["success" => false, "message" => "Missing required fields: " . implode(", ", $missingFields)];
        }

        // Get current appointment details
        $currentAppointment = $this->getAppointmentDetails($AppointmentID, $ShopID, $CustomerID);
        if (!$currentAppointment) {
            return ["success" => false, "message" => "Appointment not found."];
        }
        error_log("Current appointment details: " . json_encode($currentAppointment));

        $ServiceDetails = $this->getServiceDetails($ServiceCode);
        if (!$ServiceDetails) {
            return ["success" => false, "message" => "Service details not found."];
        }
        error_log("Service Details: " . json_encode($ServiceDetails));

        // Check availability only if date or time is changing
        if ($Date != $currentAppointment['Date'] || $Time != $currentAppointment['Time']) {
            $availableSlots = $this->getAvailableSlots($Date, $ShopID);
            error_log("Available Slots: " . json_encode($availableSlots));

            // Exclude current appointment time from availability check
            $availableSlots['available_slots'][] = $currentAppointment['Time'];

            if (!in_array($Time, $availableSlots['available_slots'])) {
                error_log("Selected time slot is not available");
                return ["success" => false, "message" => "Selected time slot is not available."];
            }
        }

        $query = "UPDATE " . $this->table_name . " 
              SET Date = :Date, Time = :Time, ServiceCode = :ServiceCode, ServiceDetails = :ServiceDetails, 
                  CarPlateNumber = :CarPlateNumber, CustomerName = :CustomerName, CustomerEmail = :CustomerEmail
              WHERE AppointmentID = :AppointmentID AND CustomerID = :CustomerID AND ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':Date', $Date);
        $stmt->bindParam(':Time', $Time);
        $stmt->bindParam(':ServiceCode', $ServiceCode);
        $stmt->bindParam(':ServiceDetails', $ServiceDetails);
        $stmt->bindParam(':CarPlateNumber', $CarPlateNumber);
        $stmt->bindParam(':CustomerName', $CustomerName);
        $stmt->bindParam(':CustomerEmail', $CustomerEmail);
        $stmt->bindParam(':AppointmentID', $AppointmentID);
        $stmt->bindParam(':CustomerID', $CustomerID);
        $stmt->bindParam(':ShopID', $ShopID);

        try {
            if ($stmt->execute()) {
                $emailHandler = new MailSender($this->conn);
                $emailData = [
                    'appointmentID' => $AppointmentID,
                    'customer_name' => $CustomerName,
                    'customer_id' => $CustomerID,
                    'date' => $Date,
                    'time' => $Time,
                    'service_code' => $ServiceCode,
                    'service_details' => $ServiceDetails,
                    'car_plate_number' => $CarPlateNumber,
                    'customer_email' => $CustomerEmail
                ];

                $emailResult = $emailHandler->sendMail($emailData);
                if ($emailResult['status'] === 'success') {
                    return [
                        "success" => true,
                        "message" => "Appointment updated successfully and email sent!"
                    ];
                } else {
                    return [
                        "success" => true,
                        "message" => "Appointment updated successfully, but email sending failed: " . $emailResult['message']
                    ];
                }
            } else {
                $errorInfo = $stmt->errorInfo();
                error_log("Database error: " . json_encode($errorInfo));
                return [
                    "success" => false,
                    "message" => "Appointment update failed. Error code: " . $errorInfo[1] . ", message: " . $errorInfo[2]
                ];
            }
        } catch (Exception $e) {
            error_log("Exception occurred: " . $e->getMessage());
            return [
                "success" => false,
                "message" => "An error occurred: " . $e->getMessage()
            ];
        }
    }

    public function delete($ShopID, $AppointmentID, $CustomerID) {
        error_log("Delete method called with parameters: " . json_encode(func_get_args()));

        if (!$AppointmentID || !$CustomerID || !$ShopID) {
            return ["success" => false, "message" => "Missing required fields."];
        }

        $query = "DELETE FROM " . $this->table_name . " WHERE AppointmentID = :AppointmentID AND CustomerID = :CustomerID AND ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':AppointmentID', $AppointmentID);
        $stmt->bindParam(':CustomerID', $CustomerID);
        $stmt->bindParam(':ShopID', $ShopID);

        try {
            if ($stmt->execute()) {
                return ["success" => true, "message" => "Appointment deleted successfully."];
            } else {
                $errorInfo = $stmt->errorInfo();
                error_log("Database error: " . json_encode($errorInfo));
                return [
                    "success" => false,
                    "message" => "Appointment deletion failed. Error code: " . $errorInfo[1]
                ];
            }
        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => $e->getMessage()
            ];
        }
    }

    public function getAppointmentDetails($AppointmentID, $ShopID, $CustomerID) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE AppointmentID = :AppointmentID AND ShopID = :ShopID AND CustomerID = :CustomerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':AppointmentID', $AppointmentID);
        $stmt->bindParam(':ShopID', $ShopID);
        $stmt->bindParam(':CustomerID', $CustomerID);

        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC); // Adjust as needed based on your database structure
    }

    public function getAppointmentById($AppointmentID) {
        error_log("Fetching appointment details for AppointmentID: $AppointmentID");

        $query = "SELECT * FROM " . $this->table_name . " 
              WHERE AppointmentID = :AppointmentID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':AppointmentID', $AppointmentID);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }


    public function getAppointmentsByShop($ShopID) {
        error_log("Fetching appointments for ShopID: $ShopID");

        if (empty($ShopID)) {
            return ["success" => false, "message" => "ShopID parameter missing."];
        }

        $query = "SELECT * FROM " . $this->table_name . " WHERE ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':ShopID', $ShopID);
        $stmt->execute();

        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return [
            "success" => true,
            "data" => $appointments
        ];
    }

    public function getAppointmentsByCustomer($CustomerID) {
        error_log("Fetching appointments for CustomerID: $CustomerID");

        if (empty($CustomerID)) {
            return ["success" => false, "message" => "CustomerID parameter missing."];
        }

        $query = "SELECT * FROM " . $this->table_name . " WHERE CustomerID = :CustomerID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':CustomerID', $CustomerID);
        $stmt->execute();

        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return [
            "success" => true,
            "data" => $appointments
        ];
    }

}

// Instantiate database and appointments object
$database = new Database();
$db = $database->getConnection();

$appointments = new Appointments($db);

// Process the request
$requestMethod = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

switch ($requestMethod) {
    case 'POST':
        // Create appointment
        if (isset($data['CustomerID'], $data['Date'], $data['Time'], $data['ServiceCode'], $data['ShopID'], $data['CarPlateNumber'], $data['CustomerEmail'], $data['CustomerName'])) {
            $response = $appointments->create(
                $data['CustomerID'],
                $data['Date'],
                $data['Time'],
                $data['ServiceCode'],
                $data['ShopID'],
                $data['CarPlateNumber'],
                $data['CustomerEmail'],
                $data['CustomerName']
            );
        } else {
            $response = ["success" => false, "message" => "Invalid input."];
        }
        break;

    case 'PUT':
        // Update appointment
        if (isset($data['ShopID'], $data['AppointmentID'], $data['CustomerID'], $data['Date'], $data['Time'], $data['ServiceCode'], $data['CarPlateNumber'], $data['CustomerName'], $data['CustomerEmail'])) {
            $response = $appointments->update(
                $data['ShopID'],
                $data['AppointmentID'],
                $data['CustomerID'],
                $data['Date'],
                $data['Time'],
                $data['ServiceCode'],
                $data['CarPlateNumber'],
                $data['CustomerName'],
                $data['CustomerEmail']
            );
        } else {
            $response = ["success" => false, "message" => "Invalid input."];
        }
        break;

    case 'DELETE':
        // Delete appointment
        if (isset($data['ShopID'], $data['AppointmentID'], $data['CustomerID'])) {
            $response = $appointments->delete(
                $data['ShopID'],
                $data['AppointmentID'],
                $data['CustomerID']
            );
        } else {
            $response = ["success" => false, "message" => "Invalid input."];
        }
        break;

    case 'GET':
        $response = [];

        if (isset($_GET['AppointmentID'])) {
            // Fetch appointment by AppointmentID
            $response = $appointments->getAppointmentById($_GET['AppointmentID']);
        } elseif (isset($_GET['ShopID']) && isset($_GET['Date'])) {
            // Fetch available slots by ShopID and Date
            $Date = $_GET['Date'];
            $ShopID = $_GET['ShopID'];
            $response = $appointments->getAvailableSlots($Date, $ShopID);
        } elseif (isset($_GET['ShopID'])) {
            // Fetch appointments by ShopID
            $response = $appointments->getAppointmentsByShop($_GET['ShopID']);
        } elseif (isset($_GET['CustomerID'])) {
            // Fetch appointments by CustomerID
            $response = $appointments->getAppointmentsByCustomer($_GET['CustomerID']);
        } else {
            // Return an error if no valid parameter is provided
            $response = ["success" => false, "message" => "No valid parameter provided."];
        }
        break;

    default:
        $response = ["success" => false, "message" => "Request method not allowed."];
        break;

}

// Set content type header
header('Content-Type: application/json');
// Output the response
echo json_encode($response);
exit();
