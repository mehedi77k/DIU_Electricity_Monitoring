<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db.php';

function send_json($status, $message, $data = [], $code = 200) {
    http_response_code($code);
    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data
    ]);
    exit;
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
    send_json(false, 'Valid level page ID is required.', [], 422);
}

$stmt = $conn->prepare("
    UPDATE floor_pages
    SET is_active = 0
    WHERE id = ?
    LIMIT 1
");

if (!$stmt) {
    send_json(false, 'Database prepare failed.', [
        'error' => $conn->error
    ], 500);
}

$stmt->bind_param('i', $id);

if (!$stmt->execute()) {
    send_json(false, 'Failed to remove level page.', [
        'error' => $stmt->error
    ], 500);
}

send_json(true, 'Level page removed successfully.');