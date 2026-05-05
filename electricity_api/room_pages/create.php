<?php
require_once __DIR__ . '/../config/bootstrap.php';

function dynamic_page_response(bool $status, string $message, array $data = [], int $httpCode = 200): void
{
    http_response_code($httpCode);
    echo json_encode([
        'status' => $status,
        'success' => $status,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function dynamic_clean($value): string
{
    return trim((string)$value);
}

function dynamic_valid_slug(string $value, int $max = 180): bool
{
    return (bool)preg_match('/^[a-z0-9_]{2,' . $max . '}$/', $value);
}

function dynamic_safe_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function dynamic_ensure_directory_from_link(string $pageLink): ?string
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

function create_room_homepage_if_missing(string $pageLink, string $buildingVerificationId, string $floorVerificationId, string $roomName): void
{
    $fullPath = dynamic_ensure_directory_from_link($pageLink);
    if (!$fullPath) {
        return;
    }

    $indexFile = $fullPath . 'index.html';
    if (file_exists($indexFile)) {
        return;
    }

    $safeRoomName = dynamic_safe_html($roomName);
    $safeBuilding = dynamic_safe_html(str_replace('_', ' ', $buildingVerificationId));
    $safeFloor = dynamic_safe_html(str_replace('_', ' ', $floorVerificationId));

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$safeRoomName} | Daffodil Smart City</title>
  <link rel="stylesheet" href="../../../../../../assets/css/style.css">
</head>
<body>
  <main class="main-content">
    <section class="page-header">
      <p class="eyebrow">Room Home</p>
      <h1>{$safeRoomName}</h1>
      <p>{$safeBuilding} - {$safeFloor}</p>
      <a class="primary-btn" href="../../index.html">Back to Level</a>
    </section>
  </main>
</body>
</html>
HTML;

    file_put_contents($indexFile, $html);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    dynamic_page_response(false, 'Only POST request is allowed.', [], 405);
}

if (empty($_SESSION['admin_id'])) {
    dynamic_page_response(false, 'Unauthorized. Please login first.', [], 401);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    dynamic_page_response(false, 'Invalid JSON request.', [], 400);
}

$buildingVerificationId = dynamic_clean($input['building_verification_id'] ?? '');
$floorVerificationId = dynamic_clean($input['floor_verification_id'] ?? '');
$roomName = dynamic_clean($input['room_name'] ?? '');
$roomVerificationId = dynamic_clean($input['room_verification_id'] ?? '');
$pageLink = dynamic_clean($input['page_link'] ?? '');

if ($buildingVerificationId === '' || !dynamic_valid_slug($buildingVerificationId, 150)) {
    dynamic_page_response(false, 'Invalid building verification ID.', [], 422);
}

if ($floorVerificationId === '' || !dynamic_valid_slug($floorVerificationId, 180)) {
    dynamic_page_response(false, 'Invalid level verification ID.', [], 422);
}

if ($roomName === '') {
    dynamic_page_response(false, 'Room name is required.', [], 422);
}

if ($roomVerificationId === '' || !dynamic_valid_slug($roomVerificationId, 180)) {
    dynamic_page_response(false, 'Invalid room verification ID.', [], 422);
}

if ($pageLink === '') {
    dynamic_page_response(false, 'Room homepage link is required.', [], 422);
}

if (stripos($pageLink, 'javascript:') === 0 || stripos($pageLink, 'data:') === 0) {
    dynamic_page_response(false, 'Invalid homepage link.', [], 422);
}

$pagePath = parse_url($pageLink, PHP_URL_PATH);
if (!$pagePath) {
    dynamic_page_response(false, 'Invalid homepage link path.', [], 422);
}

$expectedPathPart = '/daffodil_smart_city/buildings/' . $buildingVerificationId . '/floors/' . $floorVerificationId . '/rooms/' . $roomVerificationId . '/';
if (strpos($pagePath, $expectedPathPart) === false) {
    dynamic_page_response(false, 'Homepage link does not match this building, level, and room verification ID. Expected path should contain: ' . $expectedPathPart, [], 422);
}

$floorStmt = $conn->prepare(" 
    SELECT id
    FROM floor_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
      AND is_active = 1
    LIMIT 1
");

if (!$floorStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking floor_pages.', [
        'error' => $conn->error,
    ], 500);
}

$floorStmt->bind_param('ss', $buildingVerificationId, $floorVerificationId);
$floorStmt->execute();
$floorResult = $floorStmt->get_result();

if ($floorResult->num_rows !== 1) {
    dynamic_page_response(false, 'This level was not found in floor_pages. Add/save this level first.', [], 404);
}

$floorRow = $floorResult->fetch_assoc();
$floorPageId = (int)$floorRow['id'];

$catalogStmt = $conn->prepare(" 
    SELECT id
    FROM room_catalog
    WHERE building_verification_id = ?
      AND level_verification_id = ?
      AND room_name = ?
      AND room_verification_id = ?
      AND is_active = 1
    LIMIT 1
");

if (!$catalogStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking room_catalog.', [
        'error' => $conn->error,
    ], 500);
}

$catalogStmt->bind_param('ssss', $buildingVerificationId, $floorVerificationId, $roomName, $roomVerificationId);
$catalogStmt->execute();
$catalogResult = $catalogStmt->get_result();

if ($catalogResult->num_rows !== 1) {
    dynamic_page_response(false, 'This room was not found in room_catalog. Check Room Name and Verification ID.', [], 404);
}

$checkStmt = $conn->prepare(" 
    SELECT id
    FROM room_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
      AND room_verification_id = ?
    LIMIT 1
");

if (!$checkStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking room.', [
        'error' => $conn->error,
    ], 500);
}

$checkStmt->bind_param('sss', $buildingVerificationId, $floorVerificationId, $roomVerificationId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    $existing = $checkResult->fetch_assoc();
    $existingId = (int)$existing['id'];

    $updateStmt = $conn->prepare(" 
        UPDATE room_pages
        SET floor_page_id = ?,
            room_name = ?,
            page_link = ?,
            is_active = 1
        WHERE id = ?
        LIMIT 1
    ");

    if (!$updateStmt) {
        dynamic_page_response(false, 'Database prepare failed while updating room.', [
            'error' => $conn->error,
        ], 500);
    }

    $updateStmt->bind_param('issi', $floorPageId, $roomName, $pageLink, $existingId);

    if (!$updateStmt->execute()) {
        dynamic_page_response(false, 'Failed to update room page.', [
            'error' => $updateStmt->error,
        ], 500);
    }

    create_room_homepage_if_missing($pageLink, $buildingVerificationId, $floorVerificationId, $roomName);

    dynamic_page_response(true, 'Room page updated successfully.', [
        'id' => $existingId,
    ]);
}

$insertStmt = $conn->prepare(" 
    INSERT INTO room_pages
      (floor_page_id, building_verification_id, floor_verification_id, room_name, room_verification_id, page_link, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
");

if (!$insertStmt) {
    dynamic_page_response(false, 'Database prepare failed while creating room.', [
        'error' => $conn->error,
    ], 500);
}

$insertStmt->bind_param('isssss', $floorPageId, $buildingVerificationId, $floorVerificationId, $roomName, $roomVerificationId, $pageLink);

if (!$insertStmt->execute()) {
    dynamic_page_response(false, 'Failed to create room page.', [
        'error' => $insertStmt->error,
    ], 500);
}

create_room_homepage_if_missing($pageLink, $buildingVerificationId, $floorVerificationId, $roomName);

dynamic_page_response(true, 'Room page connected successfully.', [
    'id' => (int)$conn->insert_id,
], 201);
