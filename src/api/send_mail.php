<?php
// Include PHPMailer and other required files
require '../../vendor/phpmailer/phpmailer/src/Exception.php';
require '../../vendor/phpmailer/phpmailer/src/PHPMailer.php';
require '../../vendor/phpmailer/phpmailer/src/SMTP.php';
require_once '../config/database.php'; // Ensure this path is correct
require_once '../utils/functions.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class MailSender {
    private $conn;
    private $owner_table = "form_submissions";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function sendMail($data) {
        // Extract data
        $nameSurname = $data['nameSurname'];
        $email = $data['email'];
        $phone = $data['phone'];
        $shopName = $data['shopName'];
        $shopLocation = $data['shopLocation'];

        // Initialize PHPMailer
        $mail = new PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';  // Set the SMTP server
            $mail->SMTPAuth   = true;
            $mail->Username   = 'tugbamohammed.cct@gmail.com';  // Your email address
            $mail->Password   = 'srfaeimmgkpudutt';  // Your email password (ensure you use an app password if 2FA is enabled)
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            // Recipients
            $mail->setFrom('tugbamohammed.cct@gmail.com', 'Mailer');
            $mail->addAddress('tugbamohammed.cct@gmail.com', 'Admin');  // Add a recipient

            // Content
            $mail->isHTML(true);
            $mail->Subject = 'New Admin Signup Request';

            // Get the HTML template
            $htmlTemplate = file_get_contents('../../public/admin/signupFormSection.html'); // Update this path

            if ($htmlTemplate === false) {
                throw new Exception("Unable to read the HTML template file.");
            }

            // Replace placeholders with actual data
            $htmlBody = str_replace(
                ['{nameSurname}', '{email}', '{phone}', '{shopName}', '{shopLocation}'],
                [$nameSurname, $email, $phone, $shopName, $shopLocation],
                $htmlTemplate
            );

            $mail->Body = $htmlBody;

            // Send the email
            $mail->send();
            $email_sent = 1;
            $response = ['status' => 'success', 'message' => 'Email sent and logged successfully.'];
        } catch (Exception $e) {
            $email_sent = 0;
            $error_message = "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
            error_log($error_message); // Log the error message
            $response = ['status' => 'error', 'message' => $error_message];
        }

        // Log the email details
        $this->logSubmission($nameSurname, $email, $phone, $shopName, $shopLocation, $email_sent);

        // Output JSON response
        echo json_encode($response);
    }

    private function logSubmission($nameSurname, $email, $phone, $shopName, $shopLocation, $email_sent) {
        // Insert submission record into the database
        $stmt = $this->conn->prepare("INSERT INTO form_submissions (nameSurname, email, phone_number, shop_name, shop_location, email_sent, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $sent_at = date('Y-m-d H:i:s'); // Current timestamp
        $stmt->execute([$nameSurname, $email, $phone, $shopName, $shopLocation, $email_sent, $sent_at]);
    }
}

// Create a new instance of Database and get the connection
$database = new Database();
$conn = $database->getConnection();

// Read JSON input
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['nameSurname'], $data['email'], $data['phone'], $data['shopName'], $data['shopLocation'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid input']);
    exit;
}

// Create MailSender instance and send mail
$mailSender = new MailSender($conn);
$mailSender->sendMail($data);

// Close the database connection
$conn = null;
