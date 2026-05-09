<?php

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/admin_password.php';

function room_create_response(bool $status, string $message, array $data = [], int $httpCode = 200): void
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

function room_create_clean($value): string
{
    return trim((string) $value);
}

function room_create_valid_slug(string $value, int $max = 180): bool
{
    return (bool) preg_match('/^[a-z0-9_]{2,' . $max . '}$/', $value);
}

function room_create_safe_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function room_create_project_base_url(): string
{
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';

    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';

    $marker = '/electricity_api/';
    $pos = strpos($scriptName, $marker);

    if ($pos !== false) {
        $basePath = substr($scriptName, 0, $pos);
    } else {
        $basePath = '';
    }

    return rtrim($scheme . '://' . $host . $basePath, '/');
}

function room_create_build_link(
    string $buildingVerificationId,
    string $floorVerificationId,
    string $roomVerificationId
): string {
    return room_create_project_base_url()
        . '/daffodil_smart_city/buildings/'
        . $buildingVerificationId
        . '/floors/'
        . $floorVerificationId
        . '/rooms/'
        . $roomVerificationId
        . '/';
}

function room_create_validate_page_link(
    string $pageLink,
    string $buildingVerificationId,
    string $floorVerificationId,
    string $roomVerificationId
): void {
    if ($pageLink === '') {
        room_create_response(false, 'Homepage link is required.', [], 422);
    }

    if (stripos($pageLink, 'javascript:') === 0 || stripos($pageLink, 'data:') === 0) {
        room_create_response(false, 'Invalid homepage link.', [], 422);
    }

    $pagePath = parse_url($pageLink, PHP_URL_PATH);

    if (!$pagePath) {
        room_create_response(false, 'Invalid homepage link path.', [], 422);
    }

    $expectedPathPart = '/daffodil_smart_city/buildings/'
        . $buildingVerificationId
        . '/floors/'
        . $floorVerificationId
        . '/rooms/'
        . $roomVerificationId
        . '/';

    if (strpos($pagePath, $expectedPathPart) === false) {
        room_create_response(
            false,
            'Homepage link does not match this building, level and room verification ID. Expected path should contain: ' . $expectedPathPart,
            [],
            422
        );
    }
}

function room_create_ensure_directory(string $pageLink): ?string
{
    $pagePath = parse_url($pageLink, PHP_URL_PATH);

    if (!$pagePath) {
        return null;
    }

    $documentRoot = rtrim(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT'] ?? ''), '/');

    if ($documentRoot === '') {
        return null;
    }

    $fullPath = $documentRoot . $pagePath;
    $fullPath = str_replace('\\', '/', $fullPath);

    if (substr($fullPath, -1) !== '/') {
        $fullPath .= '/';
    }

    if (!is_dir($fullPath)) {
        mkdir($fullPath, 0777, true);
    }

    return $fullPath;
}

function room_create_homepage_if_missing(
    string $pageLink,
    string $buildingVerificationId,
    string $floorVerificationId,
    string $roomName
): void {
    $fullPath = room_create_ensure_directory($pageLink);

    if (!$fullPath) {
        return;
    }

    $indexFile = $fullPath . 'index.html';

    if (file_exists($indexFile)) {
        return;
    }

    $safeRoomName = room_create_safe_html($roomName);
    $safeBuildingId = room_create_safe_html($buildingVerificationId);
    $safeFloorId = room_create_safe_html($floorVerificationId);

    $pagePath = parse_url($pageLink, PHP_URL_PATH);
    $parts = explode('/', trim($pagePath, '/'));
    $roomVerificationId = end($parts);
    $safeRoomId = room_create_safe_html($roomVerificationId);

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{$safeRoomName} | Daffodil Smart City</title>
  <link rel="stylesheet" href="../../../../../../assets/css/entity-manager.css" />
</head>
<body>
  <div
    id="diuRoomHome"
    data-building-id="{$safeBuildingId}"
    data-floor-id="{$safeFloorId}"
    data-room-id="{$safeRoomId}"
  ></div>

  <script src="../../../../../../assets/js/room-home.js"></script>
</body>
</html>
HTML;

    file_put_contents($indexFile, $html);
}

/*
|--------------------------------------------------------------------------
| Request method and admin session check
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    room_create_response(false, 'Only POST request is allowed.', [], 405);
}

if (empty($_SESSION['admin_id'])) {
    room_create_response(false, 'Unauthorized. Please login first.', [], 401);
}

/*
|--------------------------------------------------------------------------
| Decode JSON input
|--------------------------------------------------------------------------
*/

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    room_create_response(false, 'Invalid JSON request.', [], 400);
}

/*
|--------------------------------------------------------------------------
| Verify current admin password
|--------------------------------------------------------------------------
*/

$adminPassword = clean_admin_password($input['admin_password'] ?? '');

if ($adminPassword === '') {
    room_create_response(false, 'Enter Your Password is required.', [], 422);
}

if (!admin_password_matches($conn, $adminPassword)) {
    room_create_response(false, 'Admin password is incorrect.', [], 403);
}

/*
|--------------------------------------------------------------------------
| Collect and validate input
|--------------------------------------------------------------------------
*/

$buildingVerificationId = strtolower(room_create_clean($input['building_verification_id'] ?? ''));
$floorVerificationId = strtolower(room_create_clean($input['floor_verification_id'] ?? ''));
$roomName = room_create_clean($input['room_name'] ?? '');
$roomVerificationId = strtolower(room_create_clean($input['room_verification_id'] ?? ''));
$pageLink = room_create_clean($input['page_link'] ?? '');

if ($buildingVerificationId === '' || !room_create_valid_slug($buildingVerificationId, 150)) {
    room_create_response(false, 'Invalid building verification ID.', [], 422);
}

if ($floorVerificationId === '' || !room_create_valid_slug($floorVerificationId, 180)) {
    room_create_response(false, 'Invalid level verification ID.', [], 422);
}

if ($roomName === '') {
    room_create_response(false, 'Room name is required.', [], 422);
}

if (strlen($roomName) < 1 || strlen($roomName) > 150) {
    room_create_response(false, 'Room name must be between 1 and 150 characters.', [], 422);
}

if ($roomVerificationId === '' || !room_create_valid_slug($roomVerificationId, 180)) {
    room_create_response(false, 'Invalid room verification ID.', [], 422);
}

if ($pageLink === '') {
    $pageLink = room_create_build_link(
        $buildingVerificationId,
        $floorVerificationId,
        $roomVerificationId
    );
}

room_create_validate_page_link(
    $pageLink,
    $buildingVerificationId,
    $floorVerificationId,
    $roomVerificationId
);

/*
|--------------------------------------------------------------------------
| Check active level exists
|--------------------------------------------------------------------------
*/

$floorStmt = $conn->prepare("
    SELECT
        fp.id
    FROM floor_pages fp
    INNER JOIN building_pages bp
        ON bp.id = fp.building_page_id
    WHERE fp.building_verification_id = ?
      AND fp.floor_verification_id = ?
      AND fp.is_active = 1
      AND bp.is_active = 1
    LIMIT 1
");

if (!$floorStmt) {
    room_create_response(false, 'Database prepare failed while checking floor page.', [
        'error' => $conn->error
    ], 500);
}

$floorStmt->bind_param('ss', $buildingVerificationId, $floorVerificationId);

if (!$floorStmt->execute()) {
    room_create_response(false, 'Database execute failed while checking floor page.', [
        'error' => $floorStmt->error
    ], 500);
}

$floorResult = $floorStmt->get_result();

if ($floorResult->num_rows !== 1) {
    room_create_response(false, 'This level is not active in floor_pages. Add or activate this level first.', [], 404);
}

$floorRow = $floorResult->fetch_assoc();
$floorPageId = (int) $floorRow['id'];

/*
|--------------------------------------------------------------------------
| Check room exists in room_catalog
|--------------------------------------------------------------------------
*/

$catalogStmt = $conn->prepare("
    SELECT
        id,
        room_name,
        room_verification_id
    FROM room_catalog
    WHERE building_verification_id = ?
      AND level_verification_id = ?
      AND room_name = ?
      AND room_verification_id = ?
      AND is_active = 1
    LIMIT 1
");

if (!$catalogStmt) {
    room_create_response(false, 'Database prepare failed while checking room catalog.', [
        'error' => $conn->error
    ], 500);
}

$catalogStmt->bind_param(
    'ssss',
    $buildingVerificationId,
    $floorVerificationId,
    $roomName,
    $roomVerificationId
);

if (!$catalogStmt->execute()) {
    room_create_response(false, 'Database execute failed while checking room catalog.', [
        'error' => $catalogStmt->error
    ], 500);
}

$catalogResult = $catalogStmt->get_result();

if ($catalogResult->num_rows !== 1) {
    room_create_response(false, 'This room was not found in room_catalog for this building and level.', [], 404);
}

$catalogRow = $catalogResult->fetch_assoc();

/*
|--------------------------------------------------------------------------
| Check duplicate room page
|--------------------------------------------------------------------------
*/

$checkStmt = $conn->prepare("
    SELECT
        id,
        is_active
    FROM room_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
      AND room_verification_id = ?
    LIMIT 1
");

if (!$checkStmt) {
    room_create_response(false, 'Database prepare failed while checking room page.', [
        'error' => $conn->error
    ], 500);
}

$checkStmt->bind_param(
    'sss',
    $buildingVerificationId,
    $floorVerificationId,
    $roomVerificationId
);

if (!$checkStmt->execute()) {
    room_create_response(false, 'Database execute failed while checking room page.', [
        'error' => $checkStmt->error
    ], 500);
}

$checkResult = $checkStmt->get_result();

/*
|--------------------------------------------------------------------------
| Reactivate/update existing room page
|--------------------------------------------------------------------------
*/

if ($checkResult->num_rows > 0) {
    $existing = $checkResult->fetch_assoc();
    $existingId = (int) $existing['id'];

    $updateStmt = $conn->prepare("
        UPDATE room_pages
        SET
            floor_page_id = ?,
            building_verification_id = ?,
            floor_verification_id = ?,
            room_name = ?,
            room_verification_id = ?,
            page_link = ?,
            is_active = 1
        WHERE id = ?
        LIMIT 1
    ");

    if (!$updateStmt) {
        room_create_response(false, 'Database prepare failed while updating room page.', [
            'error' => $conn->error
        ], 500);
    }

    $updateStmt->bind_param(
        'isssssi',
        $floorPageId,
        $buildingVerificationId,
        $floorVerificationId,
        $catalogRow['room_name'],
        $catalogRow['room_verification_id'],
        $pageLink,
        $existingId
    );

    if (!$updateStmt->execute()) {
        room_create_response(false, 'Failed to update room page.', [
            'error' => $updateStmt->error
        ], 500);
    }

    room_create_homepage_if_missing(
        $pageLink,
        $buildingVerificationId,
        $floorVerificationId,
        $catalogRow['room_name']
    );

    room_create_response(true, 'Room page activated successfully.', [
        'id' => $existingId,
        'page_link' => $pageLink
    ]);
}

/*
|--------------------------------------------------------------------------
| Insert new room page
|--------------------------------------------------------------------------
*/

$insertStmt = $conn->prepare("
    INSERT INTO room_pages (
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
    room_create_response(false, 'Database prepare failed while creating room page.', [
        'error' => $conn->error
    ], 500);
}

$insertStmt->bind_param(
    'isssss',
    $floorPageId,
    $buildingVerificationId,
    $floorVerificationId,
    $catalogRow['room_name'],
    $catalogRow['room_verification_id'],
    $pageLink
);

if (!$insertStmt->execute()) {
    room_create_response(false, 'Failed to create room page.', [
        'error' => $insertStmt->error
    ], 500);
}

$newId = (int) $conn->insert_id;

room_create_homepage_if_missing(
    $pageLink,
    $buildingVerificationId,
    $floorVerificationId,
    $catalogRow['room_name']
);

room_create_response(true, 'Room page connected successfully.', [
    'id' => $newId,
    'page_link' => $pageLink
], 201);