<?php
// Include PHPMailer and other required files
require '../../vendor/phpmailer/phpmailer/src/Exception.php';
require '../../vendor/phpmailer/phpmailer/src/PHPMailer.php';
require '../../vendor/phpmailer/phpmailer/src/SMTP.php';
require_once '../config/database.php';
require_once '../utils/functions.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class MailSender {
    private $conn;
    private $log_table = "EmailLogs"; // Create a separate table for logging email sends

    public function __construct($db) {
        $this->conn = $db;
    }

    public function sendMail($data) {
        // Extract data
        $appointmentID = isset($data['appointmentID']) ? $data['appointmentID'] : '';
        $customerName = isset($data["customer_name"]) ? $data["customer_name"] : '';
        $customerID = isset($data["customer_id"]) ? $data["customer_id"] : '';
        $date = isset($data["date"]) ? $data["date"] : '';
        $time = isset($data["time"]) ? $data["time"] : '';
        $serviceCode = isset($data["service_code"]) ? $data["service_code"] : '';
        $serviceDetails = isset($data["service_details"]) ? $data["service_details"] : '';
        $carPlateNumber = isset($data["car_plate_number"]) ? $data["car_plate_number"] : '';
        $customerEmail = isset($data["customer_email"]) ? $data["customer_email"] : '';

        // Initialize PHPMailer
        $mail = new PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'tugbamohammed.cct@gmail.com';
            $mail->Password   = 'srfaeimmgkpudutt';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            // Recipients
            $mail->setFrom('tugbamohammed.cct@gmail.com', 'Auto Service Appointment');
            $mail->addAddress($customerEmail, $customerName);

            // Content
            $mail->isHTML(true);
            $mail->Subject = 'Your Appointment Confirmation';

            // Get the HTML template
            $htmlTemplate = file_get_contents('../../public/admin/appointmentFormSection.html');

            if ($htmlTemplate === false) {
                throw new Exception("Unable to read the HTML template file.");
            }


            $htmlBody = str_replace(
                array('{{appointmentID}}', '{{customerName}}', '{{customerID}}', '{{date}}', '{{time}}', '{{serviceCode}}', '{{serviceDetails}}', '{{carPlateNumber}}'),
                array($appointmentID, $customerName, $customerID, $date, $time, $serviceCode, $serviceDetails, $carPlateNumber),
                $htmlTemplate

            );
            error_log("Email Body: " . $htmlBody);


            $mail->Body = $htmlBody;

            // Send the email
            $mail->send();
            $email_sent = 1;
            $response = array('status' => 'success', 'message' => 'Email sent and logged successfully.');
        } catch (Exception $e) {
            $email_sent = 0;
            $error_message = "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
            error_log($error_message);
            $response = array('status' => 'error', 'message' => $error_message);
        }

        $this->logSubmission($appointmentID, $customerName, $customerID, $date, $time, $serviceCode, $serviceDetails, $carPlateNumber, $email_sent);
        return $response;
    }



    private function logSubmission($appointmentID, $customerName, $customerID, $date, $time, $serviceCode, $serviceDetails, $carPlateNumber, $email_sent) {
        $query = "INSERT INTO EmailLogs (AppointmentID, CustomerName, CustomerID, Date, Time, ServiceCode, ServiceDetails, CarPlateNumber, EmailSent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->execute(array($appointmentID, $customerName, $customerID, $date, $time, $serviceCode, $serviceDetails, $carPlateNumber, $email_sent));
    }


}