<?php

require_once __DIR__ . '/../config/bootstrap.php';

function room_delete_response(bool $status, string $message, array $data = [], int $httpCode = 200): void
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
    room_delete_response(false, 'Only POST request is allowed.', [], 405);
}

if (empty($_SESSION['admin_id'])) {
    room_delete_response(false, 'Unauthorized. Please login first.', [], 401);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    room_delete_response(false, 'Invalid JSON request.', [], 400);
}

$id = (int)($input['id'] ?? 0);

if ($id <= 0) {
    room_delete_response(false, 'Valid room page ID is required.', [], 422);
}

$checkStmt = $conn->prepare("
    SELECT
        id,
        room_name
    FROM room_pages
    WHERE id = ?
    LIMIT 1
");

if (!$checkStmt) {
    room_delete_response(false, 'Database prepare failed while checking room page.', [
        'error' => $conn->error
    ], 500);
}

$checkStmt->bind_param('i', $id);
$checkStmt->execute();

$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows !== 1) {
    room_delete_response(false, 'Room page not found.', [], 404);
}

$room = $checkResult->fetch_assoc();

$deleteStmt = $conn->prepare("
    UPDATE room_pages
    SET is_active = 0
    WHERE id = ?
    LIMIT 1
");

if (!$deleteStmt) {
    room_delete_response(false, 'Database prepare failed while removing room page.', [
        'error' => $conn->error
    ], 500);
}

$deleteStmt->bind_param('i', $id);

if (!$deleteStmt->execute()) {
    room_delete_response(false, 'Failed to remove room page.', [
        'error' => $deleteStmt->error
    ], 500);
}

room_delete_response(true, 'Room page removed successfully.', [
    'id' => $id,
    'room_name' => $room['room_name']
]);