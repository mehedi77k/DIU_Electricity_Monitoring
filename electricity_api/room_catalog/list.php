<?php

require_once __DIR__ . '/../config/bootstrap.php';

function room_catalog_response(bool $status, string $message, array $data = [], int $httpCode = 200): void
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    room_catalog_response(false, 'Only GET request is allowed.', [], 405);
}

$buildingVerificationId = strtolower(trim((string)($_GET['building_verification_id'] ?? '')));
$levelVerificationId = strtolower(trim((string)($_GET['level_verification_id'] ?? '')));

if ($buildingVerificationId === '') {
    room_catalog_response(false, 'Building verification ID is required.', [], 422);
}

if ($levelVerificationId === '') {
    room_catalog_response(false, 'Level verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]{2,150}$/', $buildingVerificationId)) {
    room_catalog_response(false, 'Invalid building verification ID.', [], 422);
}

if (!preg_match('/^[a-z0-9_]{2,180}$/', $levelVerificationId)) {
    room_catalog_response(false, 'Invalid level verification ID.', [], 422);
}

$stmt = $conn->prepare("
    SELECT
        id,
        building_verification_id,
        level_verification_id,
        room_name,
        room_verification_id,
        is_active,
        created_at,
        updated_at
    FROM room_catalog
    WHERE building_verification_id = ?
      AND level_verification_id = ?
      AND is_active = 1
    ORDER BY room_name ASC, id ASC
");

if (!$stmt) {
    room_catalog_response(false, 'Database prepare failed while loading room catalog.', [
        'error' => $conn->error
    ], 500);
}

$stmt->bind_param('ss', $buildingVerificationId, $levelVerificationId);
$stmt->execute();

$result = $stmt->get_result();

$rooms = [];

while ($row = $result->fetch_assoc()) {
    $rooms[] = [
        'id' => (int)$row['id'],
        'building_verification_id' => $row['building_verification_id'],
        'level_verification_id' => $row['level_verification_id'],
        'room_name' => $row['room_name'],
        'name' => $row['room_name'],
        'roomNo' => $row['room_name'],
        'room_verification_id' => $row['room_verification_id'],
        'slug' => $row['room_verification_id'],
        'is_active' => (int)$row['is_active'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ];
}

room_catalog_response(true, 'Room catalog loaded successfully.', [
    'rooms' => $rooms
]);