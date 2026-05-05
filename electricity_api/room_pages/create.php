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

function create_room_homepage_if_missing($pageLink, $buildingVerificationId, $floorVerificationId, $roomName) {
    $path = parse_url($pageLink, PHP_URL_PATH);

    if (!$path) {
        return;
    }

    $requiredPart = '/daffodil_smart_city/buildings/' . $buildingVerificationId . '/floors/' . $floorVerificationId . '/rooms/';

    if (strpos($path, $requiredPart) === false) {
        return;
    }

    $documentRoot = rtrim(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']), '/');
    $fullPath = $documentRoot . $path;
    $fullPath = str_replace('\\', '/', $fullPath);

    if (substr($fullPath, -1) !== '/') {
        $fullPath .= '/';
    }

    if (!is_dir($fullPath)) {
        mkdir($fullPath, 0777, true);
    }

    $indexFile = $fullPath . 'index.html';

    if (file_exists($indexFile)) {
        return;
    }

    $safeRoomName = htmlspecialchars($roomName, ENT_QUOTES, 'UTF-8');
    $safeBuildingName = htmlspecialchars(str_replace('_', ' ', $buildingVerificationId), ENT_QUOTES, 'UTF-8');
    $safeFloorName = htmlspecialchars(str_replace('_', ' ', $floorVerificationId), ENT_QUOTES, 'UTF-8');

    $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>' . $safeRoomName . ' | Daffodil Smart City</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: "Segoe UI", Arial, sans-serif;
            background: #eef4fb;
            color: #172033;
        }

        .card {
            width: min(90%, 760px);
            padding: 42px;
            border-radius: 24px;
            background: #ffffff;
            box-shadow: 0 20px 60px rgba(20, 45, 80, 0.14);
            text-align: center;
        }

        h1 {
            margin: 0 0 12px;
            font-size: 42px;
        }

        p {
            margin: 0;
            color: #6d7b91;
            font-size: 18px;
            text-transform: capitalize;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>' . $safeRoomName . '</h1>
        <p>' . $safeBuildingName . ' - ' . $safeFloorName . ' room homepage.</p>
    </div>
</body>
</html>';

    file_put_contents($indexFile, $html);
}

if (!isset($_SESSION['admin_id'])) {
    send_json(false, 'Unauthorized. Please login first.', [], 401);
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    send_json(false, 'Invalid JSON request.', [], 400);
}

$buildingVerificationId = trim($input['building_verification_id'] ?? '');
$floorVerificationId = trim($input['floor_verification_id'] ?? '');
$roomName = trim($input['room_name'] ?? '');
$roomVerificationId = trim($input['room_verification_id'] ?? '');
$pageLink = trim($input['page_link'] ?? '');

if ($buildingVerificationId === '') {
    send_json(false, 'Building verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $buildingVerificationId)) {
    send_json(false, 'Building verification ID can contain only lowercase letters, numbers, and underscore.', [], 422);
}

if ($floorVerificationId === '') {
    send_json(false, 'Level verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $floorVerificationId)) {
    send_json(false, 'Level verification ID can contain only lowercase letters, numbers, and underscore.', [], 422);
}

if ($roomName === '') {
    send_json(false, 'Room name is required.', [], 422);
}

if ($roomVerificationId === '') {
    send_json(false, 'Room verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $roomVerificationId)) {
    send_json(false, 'Room verification ID can contain only lowercase letters, numbers, and underscore.', [], 422);
}

if ($pageLink === '') {
    send_json(false, 'Room homepage link is required.', [], 422);
}

if (
    stripos($pageLink, 'javascript:') === 0 ||
    stripos($pageLink, 'data:') === 0
) {
    send_json(false, 'Invalid homepage link.', [], 422);
}

$pagePath = parse_url($pageLink, PHP_URL_PATH);

if (!$pagePath) {
    send_json(false, 'Invalid homepage link path.', [], 422);
}

$expectedPathPart = '/daffodil_smart_city/buildings/' . $buildingVerificationId . '/floors/' . $floorVerificationId . '/rooms/' . $roomVerificationId . '/';

if (strpos($pagePath, $expectedPathPart) === false) {
    send_json(false, 'Homepage link does not match this building, level, and room verification ID. Expected path should contain: ' . $expectedPathPart, [], 422);
}

/*
|--------------------------------------------------------------------------
| Check floor_pages table
|--------------------------------------------------------------------------
| Room can only be added if this level exists in floor_pages.
|--------------------------------------------------------------------------
*/

$floorStmt = $conn->prepare("
    SELECT id
    FROM floor_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
      AND is_active = 1
    LIMIT 1
");

if (!$floorStmt) {
    send_json(false, 'Database prepare failed while checking floor_pages.', [
        'error' => $conn->error
    ], 500);
}

$floorStmt->bind_param('ss', $buildingVerificationId, $floorVerificationId);
$floorStmt->execute();

$floorResult = $floorStmt->get_result();

if ($floorResult->num_rows !== 1) {
    send_json(false, 'This level was not found in floor_pages table.', [], 404);
}

$floorRow = $floorResult->fetch_assoc();
$floorPageId = (int) $floorRow['id'];

/*
|--------------------------------------------------------------------------
| Insert or reactivate/update existing room
|--------------------------------------------------------------------------
*/

$checkStmt = $conn->prepare("
    SELECT id
    FROM room_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
      AND room_verification_id = ?
    LIMIT 1
");

if (!$checkStmt) {
    send_json(false, 'Database prepare failed while checking room.', [
        'error' => $conn->error
    ], 500);
}

$checkStmt->bind_param('sss', $buildingVerificationId, $floorVerificationId, $roomVerificationId);
$checkStmt->execute();

$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    $existing = $checkResult->fetch_assoc();
    $existingId = (int) $existing['id'];

    $updateStmt = $conn->prepare("
        UPDATE room_pages
        SET
            floor_page_id = ?,
            room_name = ?,
            page_link = ?,
            is_active = 1
        WHERE id = ?
    ");

    if (!$updateStmt) {
        send_json(false, 'Database prepare failed while updating room.', [
            'error' => $conn->error
        ], 500);
    }

    $updateStmt->bind_param(
        'issi',
        $floorPageId,
        $roomName,
        $pageLink,
        $existingId
    );

    if (!$updateStmt->execute()) {
        send_json(false, 'Failed to update room page.', [
            'error' => $updateStmt->error
        ], 500);
    }

    create_room_homepage_if_missing($pageLink, $buildingVerificationId, $floorVerificationId, $roomName);

    send_json(true, 'Room page updated successfully.', [
        'id' => $existingId
    ]);
}

$insertStmt = $conn->prepare("
    INSERT INTO room_pages
    (
        floor_page_id,
        building_verification_id,
        floor_verification_id,
        room_name,
        room_verification_id,
        page_link,
        is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, 1)
");

if (!$insertStmt) {
    send_json(false, 'Database prepare failed while creating room.', [
        'error' => $conn->error
    ], 500);
}

$insertStmt->bind_param(
    'isssss',
    $floorPageId,
    $buildingVerificationId,
    $floorVerificationId,
    $roomName,
    $roomVerificationId,
    $pageLink
);

if (!$insertStmt->execute()) {
    send_json(false, 'Failed to create room page.', [
        'error' => $insertStmt->error
    ], 500);
}

create_room_homepage_if_missing($pageLink, $buildingVerificationId, $floorVerificationId, $roomName);

send_json(true, 'Room page connected successfully.', [
    'id' => $conn->insert_id
], 201);