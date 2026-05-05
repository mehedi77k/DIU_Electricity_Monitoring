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
    send_json(false, 'Unauthorized. Please login from Admin Dashboard first.', [], 401);
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    send_json(false, 'Invalid JSON request.', [], 400);
}

$campusTable = trim($input['campus_table'] ?? 'daffodil_smart_city');
$buildingName = trim($input['building_name'] ?? '');
$verificationId = trim($input['verification_id'] ?? '');
$pageLink = trim($input['page_link'] ?? '');

if ($campusTable === '') {
    send_json(false, 'Campus table is required.', [], 422);
}

if ($buildingName === '') {
    send_json(false, 'Building name is required.', [], 422);
}

if ($verificationId === '') {
    send_json(false, 'Verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $verificationId)) {
    send_json(false, 'Verification ID can contain only lowercase letters, numbers, and underscore.', [], 422);
}

if ($pageLink === '') {
    send_json(false, 'Page link is required.', [], 422);
}

if (
    stripos($pageLink, 'javascript:') === 0 ||
    stripos($pageLink, 'data:') === 0
) {
    send_json(false, 'Invalid page link.', [], 422);
}

/*
|--------------------------------------------------------------------------
| Find building from building_catalog
|--------------------------------------------------------------------------
| Your building_catalog table should have the same building_name.
| Example: Knowledge Tower
|--------------------------------------------------------------------------
*/

$catalogStmt = $conn->prepare("
    SELECT id 
    FROM building_catalog 
    WHERE building_name = ? 
    LIMIT 1
");

if (!$catalogStmt) {
    send_json(false, 'Database prepare failed while checking building_catalog.', [
        'error' => $conn->error
    ], 500);
}

$catalogStmt->bind_param('s', $buildingName);
$catalogStmt->execute();

$catalogResult = $catalogStmt->get_result();

if ($catalogResult->num_rows !== 1) {
    send_json(false, 'Building was not found in building_catalog. Please check spelling.', [], 404);
}

$catalogRow = $catalogResult->fetch_assoc();
$buildingCatalogId = (int) $catalogRow['id'];

/*
|--------------------------------------------------------------------------
| Check existing active page
|--------------------------------------------------------------------------
*/

$checkStmt = $conn->prepare("
    SELECT id 
    FROM building_pages
    WHERE campus_table = ?
      AND (
        building_name = ?
        OR verification_table = ?
      )
    LIMIT 1
");

if (!$checkStmt) {
    send_json(false, 'Database prepare failed while checking existing building page.', [
        'error' => $conn->error
    ], 500);
}

$checkStmt->bind_param('sss', $campusTable, $buildingName, $verificationId);
$checkStmt->execute();

$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    $existing = $checkResult->fetch_assoc();
    $existingId = (int) $existing['id'];

    $updateStmt = $conn->prepare("
        UPDATE building_pages
        SET 
            building_catalog_id = ?,
            building_name = ?,
            verification_table = ?,
            page_link = ?,
            is_active = 1
        WHERE id = ?
    ");

    if (!$updateStmt) {
        send_json(false, 'Database prepare failed while updating building page.', [
            'error' => $conn->error
        ], 500);
    }

    $updateStmt->bind_param(
        'isssi',
        $buildingCatalogId,
        $buildingName,
        $verificationId,
        $pageLink,
        $existingId
    );

    if (!$updateStmt->execute()) {
        send_json(false, 'Failed to update building page.', [
            'error' => $updateStmt->error
        ], 500);
    }

    send_json(true, 'Building page updated successfully.', [
        'id' => $existingId
    ]);
}

/*
|--------------------------------------------------------------------------
| Insert new page
|--------------------------------------------------------------------------
*/

$insertStmt = $conn->prepare("
    INSERT INTO building_pages
    (
        campus_table,
        building_catalog_id,
        building_name,
        verification_table,
        page_link,
        is_active
    )
    VALUES (?, ?, ?, ?, ?, 1)
");

if (!$insertStmt) {
    send_json(false, 'Database prepare failed while creating building page.', [
        'error' => $conn->error
    ], 500);
}

$insertStmt->bind_param(
    'sisss',
    $campusTable,
    $buildingCatalogId,
    $buildingName,
    $verificationId,
    $pageLink
);

if (!$insertStmt->execute()) {
    send_json(false, 'Failed to create building page.', [
        'error' => $insertStmt->error
    ], 500);
}

send_json(true, 'Building page connected successfully.', [
    'id' => $conn->insert_id
], 201);