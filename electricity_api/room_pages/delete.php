<?php

require_once __DIR__ . '/../config/bootstrap.php';

if (!function_exists('send_json')) {
    function send_json($status, $message, $data = [], $httpCode = 200)
    {
        http_response_code($httpCode);

        echo json_encode([
            'status' => $status,
            'message' => $message,
            'data' => $data
        ]);

        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(false, 'Only POST request is allowed.', [], 405);
}

if (!isset($_SESSION['admin_id'])) {
    send_json(false, 'Unauthorized. Please login first.', [], 401);
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    send_json(false, 'Invalid JSON request.', [], 400);
}

$id = (int) ($input['id'] ?? 0);

if ($id <= 0) {
    send_json(false, 'Valid room page ID is required.', [], 422);
}

$checkStmt = $conn->prepare("
    SELECT id, room_name
    FROM room_pages
    WHERE id = ?
    LIMIT 1
");

if (!$checkStmt) {
    send_json(false, 'Database prepare failed while checking room page.', [
        'error' => $conn->error
    ], 500);
}

$checkStmt->bind_param('i', $id);
$checkStmt->execute();

$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows !== 1) {
    send_json(false, 'Room page not found.', [], 404);
}

$room = $checkResult->fetch_assoc();

$deleteStmt = $conn->prepare("
    UPDATE room_pages
    SET is_active = 0
    WHERE id = ?
    LIMIT 1
");

if (!$deleteStmt) {
    send_json(false, 'Database prepare failed while removing room page.', [
        'error' => $conn->error
    ], 500);
}

$deleteStmt->bind_param('i', $id);

if (!$deleteStmt->execute()) {
    send_json(false, 'Failed to remove room page.', [
        'error' => $deleteStmt->error
    ], 500);
}

send_json(true, 'Room page removed successfully.', [
    'id' => $id,
    'room_name' => $room['room_name']
]);