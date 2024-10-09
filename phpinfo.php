<?php
$to = 'tugbamohammed.cct@gmail.com';
$subject = 'Test Email';
$message = 'This is a test email';
$headers = 'From: tugbamohammed.cct@gmail.com';

if (mail($to, $subject, $message, $headers)) {
    echo 'Email sent successfully';
} else {
    echo 'Failed to send email';
}
