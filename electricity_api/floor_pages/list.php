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

if ($buildingVerificationId === '') {
    send_json(false, 'Building verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $buildingVerificationId)) {
    send_json(false, 'Invalid building verification ID.', [], 422);
}

$stmt = $conn->prepare("
    SELECT
        id,
        building_page_id,
        building_verification_id,
        floor_name,
        floor_verification_id,
        page_link,
        is_active,
        created_at
    FROM floor_pages
    WHERE building_verification_id = ?
      AND is_active = 1
    ORDER BY id ASC
");

if (!$stmt) {
    send_json(false, 'Database prepare failed.', [
        'error' => $conn->error
    ], 500);
}

$stmt->bind_param('s', $buildingVerificationId);
$stmt->execute();

$result = $stmt->get_result();

$floors = [];

while ($row = $result->fetch_assoc()) {
    $floors[] = [
        'id' => (int) $row['id'],
        'building_page_id' => $row['building_page_id'] === null ? null : (int) $row['building_page_id'],
        'building_verification_id' => $row['building_verification_id'],
        'floor_name' => $row['floor_name'],
        'floor_verification_id' => $row['floor_verification_id'],
        'page_link' => $row['page_link'],
        'is_active' => (int) $row['is_active'],
        'created_at' => $row['created_at']
    ];
}

send_json(true, 'Floor pages loaded successfully.', [
    'floors' => $floors
]);