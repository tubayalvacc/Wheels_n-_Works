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
    private $table_name = "Appointments";
    private $table_name3 = "Services";

    public function __construct($db)
    {
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

    public function create($CustomerID, $Date, $Time, $ServiceCode, $ShopID, $CarPlateNumber, $CustomerEmail, $CustomerName)
    {
        try {
            $this->conn->beginTransaction();

            // Check if the slot is already booked
            $checkQuery = "SELECT * FROM " . $this->table_name . " WHERE ShopID = :ShopID AND Date = :Date AND Time = :Time";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':ShopID', $ShopID);
            $checkStmt->bindParam(':Date', $Date);
            $checkStmt->bindParam(':Time', $Time);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                $this->conn->rollBack();
                return ["success" => false, "message" => "This time slot is already booked."];
            }

            $ServiceDetails = $this->getServiceDetails($ServiceCode);

            // Insert the appointment
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

            if ($stmt->execute()) {
                $appointmentID = $this->conn->lastInsertId();

                // Send email notification
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
                    $this->conn->commit();
                    return [
                        "success" => true,
                        "message" => "Appointment created successfully and email sent!",
                        "data" => ["appointmentID" => $appointmentID]
                    ];
                } else {
                    $this->conn->rollBack();
                    return [
                        "success" => true,
                        "message" => "Appointment created successfully, but email sending failed: " . $emailResult['message'],
                        "data" => ["appointmentID" => $appointmentID]
                    ];
                }
            } else {
                $errorInfo = $stmt->errorInfo();
                $this->conn->rollBack();
                error_log("Database error: " . json_encode($errorInfo));
                return [
                    "success" => false,
                    "message" => "Appointment creation failed. Error code: " . $errorInfo[1]
                ];
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Exception: " . $e->getMessage());
            return [
                "success" => false,
                "message" => $e->getMessage()
            ];
        }
    }

    public function getSlotsStatus($ShopID, $Date)
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
        $unavailable_slots = $booked_slots;

        return [
            "success" => true,
            "message" => "Slots status retrieved successfully.",
            "data" => [
                "available_slots" => array_values($available_slots),
                "unavailable_slots" => array_values($unavailable_slots)
            ]
        ];
    }

    public function update($AppointmentID, $CustomerID, $Date, $Time, $ServiceCode, $ShopID, $CarPlateNumber, $CustomerEmail, $CustomerName)
    {
        $query = "UPDATE " . $this->table_name . " 
                  SET CustomerID = :CustomerID, Date = :Date, Time = :Time, ServiceCode = :ServiceCode, 
                      ShopID = :ShopID, CarPlateNumber = :CarPlateNumber, CustomerEmail = :CustomerEmail, CustomerName = :CustomerName
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
        $stmt->bindParam(':CustomerName', $CustomerName);

        if ($stmt->execute()) {
            return ["success" => true, "message" => "Appointment updated successfully."];
        } else {
            return ["success" => false, "message" => "Failed to update appointment."];
        }
    }
}

// Create a new instance of the database and AppointmentAPI
$database = new Database();
$db = $database->getConnection();
$appointments = new AppointmentAPI($db);

$method = $_SERVER['REQUEST_METHOD'];

// Extract ShopID from query parameters if available
$ShopID = isset($_GET['ShopID']) ? $_GET['ShopID'] : (isset($_POST['ShopID']) ? $_POST['ShopID'] : null);

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['CustomerID'], $data['Date'], $data['Time'], $data['ServiceCode'], $data['CarPlateNumber'], $data['CustomerEmail'], $data['CustomerName'], $data['ShopID'])) {
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
            $response = ["success" => false, "message" => "Required data missing."];
        }
        break;


    case 'GET':
        if (isset($_GET['Date'])) {
            $Date = $_GET['Date'];
            if ($ShopID) {
                $response = $appointments->getSlotsStatus($ShopID, $Date);
            } else {
                $response = ["success" => false, "message" => "ShopID is required for slot status."];
            }
        } else {
            $response = ["success" => false, "message" => "Date parameter is required."];
        }
        break;

    case 'PUT':
        parse_str(file_get_contents("php://input"), $data);
        if (isset($data['AppointmentID'], $data['CustomerID'], $data['Date'], $data['Time'], $data['ServiceCode'], $data['ShopID'], $data['CarPlateNumber'], $data['CustomerEmail'], $data['CustomerName'])) {
            $response = $appointments->update(
                $data['AppointmentID'],
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
            $response = ["success" => false, "message" => "Required data missing."];
        }
        break;

    default:
        $response = ["success" => false, "message" => "Unsupported request method."];
        break;
}

// Return response as JSON
echo json_encode($response);
