<?php
$DB_HOST = 'localhost';
$DB_NAME = 'electricity_demoweb';
$DB_USER = 'root';
$DB_PASS = '';

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed.',
        'error' => $conn->connect_error
    ]);
    exit;
}

$conn->set_charset('utf8mb4');
