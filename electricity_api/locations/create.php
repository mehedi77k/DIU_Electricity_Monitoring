<?php
require_once __DIR__ . '/../config/bootstrap.php';

require_method('POST');
require_admin();

$input = get_json_input();

$locationName = clean_text($input['location_name'] ?? '');
$verificationTable = strtolower(clean_text($input['verification_table'] ?? ($input['verification_id'] ?? '')));
$pageLink = clean_text($input['page_link'] ?? '');

if ($locationName === '' || $verificationTable === '' || $pageLink === '') {
    json_response(false, 'Location name, verification ID and homepage link are required.', [], 422);
}

if (mb_strlen($locationName) < 2 || mb_strlen($locationName) > 150) {
    json_response(false, 'Location name must be between 2 and 150 characters.', [], 422);
}

if (!preg_match('/^[a-z0-9_]{2,100}$/', $verificationTable)) {
    json_response(false, 'Verification ID must be a valid database table name. Use lowercase letters, numbers and underscore only.', [], 422);
}

if (!filter_var($pageLink, FILTER_VALIDATE_URL)) {
    json_response(false, 'Please enter a valid homepage link.', [], 422);
}

/*
|--------------------------------------------------------------------------
| Verify database table exists
|--------------------------------------------------------------------------
| Admin যে Verification ID দিবে, সেটা database table name হিসেবে check হবে.
|--------------------------------------------------------------------------
*/

$checkTable = $conn->prepare("
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ?
    LIMIT 1
");

if (!$checkTable) {
    json_response(false, 'Database prepare failed while verifying table.', [], 500);
}

$checkTable->bind_param('s', $verificationTable);
$checkTable->execute();

$tableResult = $checkTable->get_result();

if ($tableResult->num_rows !== 1) {
    json_response(false, 'Invalid Verification ID. No matching database table found.', [], 422);
}

/*
|--------------------------------------------------------------------------
| Check duplicate location
|--------------------------------------------------------------------------
*/

$checkLocation = $conn->prepare("
    SELECT id
    FROM location_pages
    WHERE verification_table = ?
    LIMIT 1
");

if (!$checkLocation) {
    json_response(false, 'Database prepare failed while checking location.', [], 500);
}

$checkLocation->bind_param('s', $verificationTable);
$checkLocation->execute();

$existing = $checkLocation->get_result();

if ($existing->num_rows > 0) {
    $existingRow = $existing->fetch_assoc();
    $existingId = (int)$existingRow['id'];

    $reactivate = $conn->prepare("
        UPDATE location_pages
        SET location_name = ?, page_link = ?, is_active = 1
        WHERE id = ?
        LIMIT 1
    ");

    if (!$reactivate) {
        json_response(false, 'Database prepare failed while updating location.', [], 500);
    }

    $reactivate->bind_param('ssi', $locationName, $pageLink, $existingId);

    if (!$reactivate->execute()) {
        json_response(false, 'Failed to update existing location.', [], 500);
    }

    json_response(true, 'Location homepage updated successfully.', [
        'location_id' => $existingId
    ]);
}

/*
|--------------------------------------------------------------------------
| Create location homepage card
|--------------------------------------------------------------------------
*/

$insert = $conn->prepare("
    INSERT INTO location_pages
    (location_name, verification_table, page_link, is_active)
    VALUES (?, ?, ?, 1)
");

if (!$insert) {
    json_response(false, 'Database prepare failed while creating location.', [], 500);
}

$insert->bind_param('sss', $locationName, $verificationTable, $pageLink);

if (!$insert->execute()) {
    json_response(false, 'Failed to create location homepage.', [
        'error' => $conn->error
    ], 500);
}

json_response(true, 'Location homepage created successfully.', [
    'location_id' => (int)$conn->insert_id
], 201);