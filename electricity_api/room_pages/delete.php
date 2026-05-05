<?php

require_once __DIR__ . '/../config/bootstrap.php';

function send_json_response(bool $status, string $message, array $data = [], int $httpCode = 200): void
{
    http_response_code($httpCode);

    echo json_encode([
        'status' => $status,
        'success' => $status,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Only POST request is allowed.', [], 405);
}

if (!isset($_SESSION['admin_id'])) {
    send_json_response(false, 'Unauthorized. Please login first.', [], 401);
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    send_json_response(false, 'Invalid JSON request.', [], 400);
}

$id = (int) ($input['id'] ?? 0);

if ($id <= 0) {
    send_json_response(false, 'Valid room page ID is required.', [], 422);
}

$checkStmt = $conn->prepare("
    SELECT id, room_name
    FROM room_pages
    WHERE id = ?
    LIMIT 1
");

if (!$checkStmt) {
    send_json_response(false, 'Database prepare failed while checking room page.', [
        'error' => $conn->error
    ], 500);
}

$checkStmt->bind_param('i', $id);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows !== 1) {
    send_json_response(false, 'Room page not found.', [], 404);
}

$room = $checkResult->fetch_assoc();

$deleteStmt = $conn->prepare("
    UPDATE room_pages
    SET is_active = 0
    WHERE id = ?
    LIMIT 1
");

if (!$deleteStmt) {
    send_json_response(false, 'Database prepare failed while removing room page.', [
        'error' => $conn->error
    ], 500);
}

$deleteStmt->bind_param('i', $id);

if (!$deleteStmt->execute()) {
    send_json_response(false, 'Failed to remove room page.', [
        'error' => $deleteStmt->error
    ], 500);
}

send_json_response(true, 'Room page removed successfully.', [
    'id' => $id,
    'room_name' => $room['room_name']
]);