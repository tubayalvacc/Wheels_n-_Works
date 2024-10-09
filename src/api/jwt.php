<?php
require 'vendor/autoload.php'; // Load Composer packages

use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

// Function to generate JWT
function generateJWT($id, $secret) {
    $payload = [
        'iss' => 'localhost',  // Issuer
        'aud' => 'localhost',  // Audience
        'iat' => time(),             // Issued at
        'nbf' => time(),             // Not before
        'exp' => time() + 3600,      // Expiration time (1 hour)
        'id'  => $id                 // Payload data
    ];

    return JWT::encode($payload, $secret);
}

// Function to validate JWT
function validateToken($jwt, $secret) {
    try {
        $decoded = JWT::decode($jwt, new Key($secret, 'HS256'));
        return (array) $decoded;
    } catch (Exception $e) {
        return false;
    }
}
