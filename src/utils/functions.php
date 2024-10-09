<?php
//AUTHOR-MADE BY TUĞBA YALVAÇ MOHAMMED
function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        throw new Exception("Env file not found.");
    }

    $env = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($env as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
            putenv(sprintf('%s=%s', $key, $value));
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

function validateInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

function jsonResponse($data, $status = 200) {
    header("Content-Type: application/json");
    http_response_code($status);
    echo json_encode($data);
}

loadEnv(__DIR__ . '/../../.env');
