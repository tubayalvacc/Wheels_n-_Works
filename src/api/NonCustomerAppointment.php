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

// Handle OPTIONS method for preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

class Appointments {
    private $conn;
    private $table_name = "Appointment";
    private $table_name3 = "Services";
    private $table_name4 = "Shops";

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

        $query = "SELECT Time FROM " . $this->table_name . " WHERE Date = :Date AND ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':Date', $Date);
        $stmt->bindParam(':ShopID', $ShopID);
        $stmt->execute();
        $bookedTimes = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

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

    public function update($ShopID, $AppointmentID, $Date, $Time, $ServiceCode, $CarPlateNumber, $CustomerName, $CustomerEmail) {
        error_log("Update method called with parameters: " . json_encode(func_get_args()));

        // Input validation
        if (!$ShopID || !$AppointmentID || !$Date || !$Time || !$ServiceCode) {
            return ["success" => false, "message" => "Missing required fields."];
        }

        // Get current appointment details
        $currentAppointment = $this->getAppointmentDetailsById($AppointmentID);
        if (!$currentAppointment) {
            return ["success" => false, "message" => "Appointment not found."];
        }
        error_log("Current appointment details: " . json_encode($currentAppointment));

        $ServiceDetails = $this->getServiceDetails($ServiceCode);
        error_log("Service Details: " . $ServiceDetails);

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

        // Prepare the SQL query
        $query = "UPDATE " . $this->table_name . " 
              SET Date = :Date, Time = :Time, ServiceCode = :ServiceCode, ServiceDetails = :ServiceDetails, 
                  CarPlateNumber = :CarPlateNumber, CustomerName = :CustomerName, CustomerEmail = :CustomerEmail
              WHERE AppointmentID = :AppointmentID AND ShopID = :ShopID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':Date', $Date);
        $stmt->bindParam(':Time', $Time);
        $stmt->bindParam(':ServiceCode', $ServiceCode);
        $stmt->bindParam(':ServiceDetails', $ServiceDetails);
        $stmt->bindParam(':CarPlateNumber', $CarPlateNumber);
        $stmt->bindParam(':CustomerName', $CustomerName);
        $stmt->bindParam(':CustomerEmail', $CustomerEmail);
        $stmt->bindParam(':AppointmentID', $AppointmentID);
        $stmt->bindParam(':ShopID', $ShopID);

        try {
            if ($stmt->execute()) {
                // Send email after successful update
                $mailSender = new MailSender($this->conn);
                $emailData = [
                    'appointmentID' => $AppointmentID,
                    'customer_name' => $CustomerName,
                    'customer_id' => $currentAppointment['CustomerID'],
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
                    "message" => "Appointment update failed. Error code: " . $errorInfo[1]
                ];
            }
        } catch (Exception $e) {
            error_log("Exception in update method: " . $e->getMessage());
            return ["success" => false, "message" => $e->getMessage()];
        }
    }


    public function delete($AppointmentID ) {
        $query = "DELETE FROM " . $this->table_name . " WHERE AppointmentID = :AppointmentID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':AppointmentID', $AppointmentID);


        try {
            if ($stmt->execute()) {
                return ["message" => "Appointment deleted successfully."];
            } else {
                $errorInfo = $stmt->errorInfo();
                error_log("Database error: " . json_encode($errorInfo));
                return ["message" => "Appointment deletion failed. Error code: " . $errorInfo[1]];
            }
        } catch (Exception $e) {
            return ["message" => $e->getMessage()];
        }
    }
    // New method to fetch all shops
    public function getAllShops() {
        $query = "SELECT ShopID, ShopName, Location FROM " . $this->table_name4;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    public function getAllServiceDetails() {
        // Modify query to fetch all services with ServiceCode, Name, and Cost
        $query = "SELECT ServiceCode, ServiceName, Cost FROM " . $this->table_name3;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        // Fetch all results
        $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Return the results
        return $services;
    }

    public function getAppointmentDetailsById($AppointmentID) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE AppointmentID = :AppointmentID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':AppointmentID', $AppointmentID);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}

// Instantiate DB & connect
$database = new Database();
$db = $database->getConnection();

// Instantiate appointments object
$appointments = new Appointments($db);

// Handle request
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['allShops'])) {
            $shops = $appointments->getAllShops();
            echo json_encode($shops);
        } elseif (isset($_GET['Date']) && isset($_GET['ShopID'])) {
            $result = $appointments->getAvailableSlots($_GET['Date'], $_GET['ShopID']);
            echo json_encode($result);
        } elseif  (isset($_GET['allServices'])){
            $services = $appointments -> getAllServiceDetails();
            echo json_encode($services);
        }elseif (isset($_GET['AppointmentID'])) {
            $appointment = $appointments->getAppointmentDetailsById($_GET['AppointmentID']);
            echo json_encode($appointment);
        }else {
            echo json_encode(["message" => "Missing parameters."]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $result = $appointments->create(
            isset($input['CustomerID']) ? $input['CustomerID'] : null,
            $input['Date'],
            $input['Time'],
            $input['ServiceCode'],
            $input['ShopID'],
            isset($input['CarPlateNumber']) ? $input['CarPlateNumber'] : null,
            $input['CustomerEmail'],
            $input['CustomerName']
        );
        echo json_encode($result);
        break;

    case 'PUT':
        // Parse input data
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
            exit;
        }

        $result = $appointments->update(
            $data['ShopID'],
            $data['AppointmentID'],
            $data['Date'],
            $data['Time'],
            $data['ServiceCode'],
            $data['CarPlateNumber'],
            $data['CustomerName'],
            $data['CustomerEmail']
        );
        echo json_encode($result);
        break;

    case 'DELETE':
        if (isset($_GET['AppointmentID'])) {
            $result = $appointments->delete($_GET['AppointmentID']);
            echo json_encode($result);
        } else {
            echo json_encode(["message" => "Missing parameters."]);
        }
        break;

    default:
        echo json_encode(["message" => "Invalid request method."]);
        break;
}
