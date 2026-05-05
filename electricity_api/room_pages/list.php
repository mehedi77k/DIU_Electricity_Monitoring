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

$buildingVerificationId = trim($_GET['building_verification_id'] ?? '');
$floorVerificationId = trim($_GET['floor_verification_id'] ?? '');

if ($buildingVerificationId === '') {
    send_json(false, 'Building verification ID is required.', [], 422);
}

if ($floorVerificationId === '') {
    send_json(false, 'Level verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $buildingVerificationId)) {
    send_json(false, 'Invalid building verification ID.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $floorVerificationId)) {
    send_json(false, 'Invalid level verification ID.', [], 422);
}

$stmt = $conn->prepare("
    SELECT
        id,
        floor_page_id,
        building_verification_id,
        floor_verification_id,
        room_name,
        room_verification_id,
        page_link,
        is_active,
        created_at
    FROM room_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
      AND is_active = 1
    ORDER BY id ASC
");

if (!$stmt) {
    send_json(false, 'Database prepare failed.', [
        'error' => $conn->error
    ], 500);
}

$stmt->bind_param('ss', $buildingVerificationId, $floorVerificationId);
$stmt->execute();

$result = $stmt->get_result();

$rooms = [];

while ($row = $result->fetch_assoc()) {
    $rooms[] = [
        'id' => (int) $row['id'],
        'floor_page_id' => $row['floor_page_id'] === null ? null : (int) $row['floor_page_id'],
        'building_verification_id' => $row['building_verification_id'],
        'floor_verification_id' => $row['floor_verification_id'],
        'room_name' => $row['room_name'],
        'room_verification_id' => $row['room_verification_id'],
        'page_link' => $row['page_link'],
        'is_active' => (int) $row['is_active'],
        'created_at' => $row['created_at']
    ];
}

send_json(true, 'Room pages loaded successfully.', [
    'rooms' => $rooms
]);