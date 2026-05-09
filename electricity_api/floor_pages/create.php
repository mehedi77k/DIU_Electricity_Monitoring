<?php

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/admin_password.php';

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
    return trim((string) $value);
}

function dynamic_valid_slug(string $value, int $max = 180): bool
{
    return (bool) preg_match('/^[a-z0-9_]{2,' . $max . '}$/', $value);
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

function create_floor_homepage_if_missing(
    string $pageLink,
    string $buildingVerificationId,
    string $floorVerificationId,
    string $floorName
): void {
    $fullPath = dynamic_ensure_directory_from_link($pageLink);

    if (!$fullPath) {
        return;
    }

    $indexFile = $fullPath . 'index.html';

    if (file_exists($indexFile)) {
        return;
    }

    $safeTitle = dynamic_safe_html($floorName);
    $safeBuildingId = dynamic_safe_html($buildingVerificationId);
    $safeFloorId = dynamic_safe_html($floorVerificationId);

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{$safeTitle} | Daffodil Smart City</title>
  <link rel="stylesheet" href="../../../../assets/css/entity-manager.css" />
</head>
<body>
  <div
    id="diuEntityApp"
    data-entity="room"
    data-campus-table="daffodil_smart_city"
    data-building-id="{$safeBuildingId}"
    data-floor-id="{$safeFloorId}"
  ></div>

  <script src="../../../../assets/js/entity-manager.js"></script>
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
    dynamic_page_response(false, 'Only POST request is allowed.', [], 405);
}

if (empty($_SESSION['admin_id'])) {
    dynamic_page_response(false, 'Unauthorized. Please login first.', [], 401);
}

/*
|--------------------------------------------------------------------------
| Decode JSON input
|--------------------------------------------------------------------------
*/

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    dynamic_page_response(false, 'Invalid JSON request.', [], 400);
}

/*
|--------------------------------------------------------------------------
| Verify current admin password
|--------------------------------------------------------------------------
*/

$adminPassword = dynamic_clean($input['admin_password'] ?? '');

if ($adminPassword === '') {
    dynamic_page_response(false, 'Enter Your Password is required.', [], 422);
}

if (!admin_password_matches($conn, $adminPassword)) {
    dynamic_page_response(false, 'Admin password is incorrect.', [], 403);
}

/*
|--------------------------------------------------------------------------
| Collect and validate input
|--------------------------------------------------------------------------
*/

$buildingVerificationId = strtolower(dynamic_clean($input['building_verification_id'] ?? ''));
$floorName = dynamic_clean($input['floor_name'] ?? '');
$floorVerificationId = strtolower(dynamic_clean($input['floor_verification_id'] ?? ''));
$pageLink = dynamic_clean($input['page_link'] ?? '');

if ($buildingVerificationId === '' || !dynamic_valid_slug($buildingVerificationId, 150)) {
    dynamic_page_response(false, 'Invalid building verification ID.', [], 422);
}

if ($floorName === '') {
    dynamic_page_response(false, 'Level name is required.', [], 422);
}

if (strlen($floorName) < 1 || strlen($floorName) > 150) {
    dynamic_page_response(false, 'Level name must be between 1 and 150 characters.', [], 422);
}

if ($floorVerificationId === '' || !dynamic_valid_slug($floorVerificationId, 180)) {
    dynamic_page_response(false, 'Invalid level verification ID.', [], 422);
}

if ($pageLink === '') {
    dynamic_page_response(false, 'Homepage link is required.', [], 422);
}

if (stripos($pageLink, 'javascript:') === 0 || stripos($pageLink, 'data:') === 0) {
    dynamic_page_response(false, 'Invalid homepage link.', [], 422);
}

$pagePath = parse_url($pageLink, PHP_URL_PATH);

if (!$pagePath) {
    dynamic_page_response(false, 'Invalid homepage link path.', [], 422);
}

$expectedPathPart = '/daffodil_smart_city/buildings/' . $buildingVerificationId . '/floors/' . $floorVerificationId . '/';

if (strpos($pagePath, $expectedPathPart) === false) {
    dynamic_page_response(
        false,
        'Homepage link does not match this building and level verification ID. Expected path should contain: ' . $expectedPathPart,
        [],
        422
    );
}

/*
|--------------------------------------------------------------------------
| Check building exists in building_pages
|--------------------------------------------------------------------------
*/

$buildingStmt = $conn->prepare("
    SELECT id
    FROM building_pages
    WHERE verification_table = ?
      AND is_active = 1
    LIMIT 1
");

if (!$buildingStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking building_pages.', [
        'error' => $conn->error,
    ], 500);
}

$buildingStmt->bind_param('s', $buildingVerificationId);

if (!$buildingStmt->execute()) {
    dynamic_page_response(false, 'Database execute failed while checking building_pages.', [
        'error' => $buildingStmt->error,
    ], 500);
}

$buildingResult = $buildingStmt->get_result();

if ($buildingResult->num_rows !== 1) {
    dynamic_page_response(false, 'This building was not found in building_pages or it is inactive.', [], 404);
}

$buildingRow = $buildingResult->fetch_assoc();
$buildingPageId = (int) $buildingRow['id'];

/*
|--------------------------------------------------------------------------
| Check level exists in level_catalog
|--------------------------------------------------------------------------
*/

$catalogStmt = $conn->prepare("
    SELECT id
    FROM level_catalog
    WHERE building_verification_id = ?
      AND level_name = ?
      AND level_verification_id = ?
      AND is_active = 1
    LIMIT 1
");

if (!$catalogStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking level_catalog.', [
        'error' => $conn->error,
    ], 500);
}

$catalogStmt->bind_param('sss', $buildingVerificationId, $floorName, $floorVerificationId);

if (!$catalogStmt->execute()) {
    dynamic_page_response(false, 'Database execute failed while checking level_catalog.', [
        'error' => $catalogStmt->error,
    ], 500);
}

$catalogResult = $catalogStmt->get_result();

if ($catalogResult->num_rows !== 1) {
    dynamic_page_response(
        false,
        'This level was not found in level_catalog. Check Level Name and Verification ID.',
        [],
        404
    );
}

/*
|--------------------------------------------------------------------------
| Check duplicate level page
|--------------------------------------------------------------------------
*/

$checkStmt = $conn->prepare("
    SELECT id
    FROM floor_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
    LIMIT 1
");

if (!$checkStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking level.', [
        'error' => $conn->error,
    ], 500);
}

$checkStmt->bind_param('ss', $buildingVerificationId, $floorVerificationId);

if (!$checkStmt->execute()) {
    dynamic_page_response(false, 'Database execute failed while checking level.', [
        'error' => $checkStmt->error,
    ], 500);
}

$checkResult = $checkStmt->get_result();

/*
|--------------------------------------------------------------------------
| Reactivate/update existing level page
|--------------------------------------------------------------------------
*/

if ($checkResult->num_rows > 0) {
    $existing = $checkResult->fetch_assoc();
    $existingId = (int) $existing['id'];

    $updateStmt = $conn->prepare("
        UPDATE floor_pages
        SET building_page_id = ?,
            floor_name = ?,
            page_link = ?,
            is_active = 1
        WHERE id = ?
        LIMIT 1
    ");

    if (!$updateStmt) {
        dynamic_page_response(false, 'Database prepare failed while updating level.', [
            'error' => $conn->error,
        ], 500);
    }

    $updateStmt->bind_param('issi', $buildingPageId, $floorName, $pageLink, $existingId);

    if (!$updateStmt->execute()) {
        dynamic_page_response(false, 'Failed to update level page.', [
            'error' => $updateStmt->error,
        ], 500);
    }

    create_floor_homepage_if_missing($pageLink, $buildingVerificationId, $floorVerificationId, $floorName);

    dynamic_page_response(true, 'Level page updated successfully.', [
        'id' => $existingId,
    ]);
}

/*
|--------------------------------------------------------------------------
| Insert new level page
|--------------------------------------------------------------------------
*/

$insertStmt = $conn->prepare("
    INSERT INTO floor_pages
      (building_page_id, building_verification_id, floor_name, floor_verification_id, page_link, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
");

if (!$insertStmt) {
    dynamic_page_response(false, 'Database prepare failed while creating level.', [
        'error' => $conn->error,
    ], 500);
}

$insertStmt->bind_param(
    'issss',
    $buildingPageId,
    $buildingVerificationId,
    $floorName,
    $floorVerificationId,
    $pageLink
);

if (!$insertStmt->execute()) {
    dynamic_page_response(false, 'Failed to create level page.', [
        'error' => $insertStmt->error,
    ], 500);
}

create_floor_homepage_if_missing($pageLink, $buildingVerificationId, $floorVerificationId, $floorName);

dynamic_page_response(true, 'Level page connected successfully.', [
    'id' => (int) $conn->insert_id,
], 201);