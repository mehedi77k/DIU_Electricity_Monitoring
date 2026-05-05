<?php
require_once __DIR__ . '/../config/bootstrap.php';

require_method('POST');
require_admin();

$input = get_json_input();

$deviceName = clean_text($input['device_name'] ?? '');
$deviceType = clean_text($input['device_type'] ?? '');
$campusId = (int)($input['campus_id'] ?? 0);
$buildingId = (int)($input['building_id'] ?? 0);
$verificationId = strtolower(clean_text($input['verification_id'] ?? ''));
$dataLink = clean_text($input['data_link'] ?? '');
$status = clean_text($input['status'] ?? 'online');

if (
    $deviceName === '' ||
    $deviceType === '' ||
    $campusId <= 0 ||
    $buildingId <= 0 ||
    $verificationId === '' ||
    $dataLink === ''
) {
    json_response(false, 'All fields are required.', [], 422);
}

if (!valid_verification_id($verificationId)) {
    json_response(false, 'Verification ID must use lowercase letters, numbers, and underscore only. Example: knowledge_tower_meter_01', [], 422);
}

if (!filter_var($dataLink, FILTER_VALIDATE_URL)) {
    json_response(false, 'Please enter a valid data link.', [], 422);
}

if (!in_array($status, ['online', 'offline', 'not_installed'], true)) {
    $status = 'online';
}

$checkCampus = $conn->prepare('SELECT id FROM campuses WHERE id = ? LIMIT 1');

if (!$checkCampus) {
    json_response(false, 'Database prepare failed while checking campus.', [], 500);
}

$checkCampus->bind_param('i', $campusId);
$checkCampus->execute();

if ($checkCampus->get_result()->num_rows !== 1) {
    json_response(false, 'Invalid campus selected.', [], 422);
}

$checkBuilding = $conn->prepare('SELECT id FROM buildings WHERE id = ? AND campus_id = ? LIMIT 1');

if (!$checkBuilding) {
    json_response(false, 'Database prepare failed while checking building.', [], 500);
}

$checkBuilding->bind_param('ii', $buildingId, $campusId);
$checkBuilding->execute();

if ($checkBuilding->get_result()->num_rows !== 1) {
    json_response(false, 'Invalid building selected for this campus.', [], 422);
}

$checkDevice = $conn->prepare('SELECT id FROM devices WHERE verification_id = ? LIMIT 1');

if (!$checkDevice) {
    json_response(false, 'Database prepare failed while checking device.', [], 500);
}

$checkDevice->bind_param('s', $verificationId);
$checkDevice->execute();

if ($checkDevice->get_result()->num_rows > 0) {
    json_response(false, 'This Verification ID already exists. Use a different one.', [], 409);
}

/*
|--------------------------------------------------------------------------
| Shared device system
|--------------------------------------------------------------------------
| No admin_id is inserted here.
| So any admin who logs in can see this device from devices/list.php.
|--------------------------------------------------------------------------
*/

$conn->begin_transaction();

try {
    $insert = $conn->prepare(
        'INSERT INTO devices
        (device_name, device_type, campus_id, building_id, verification_id, data_link, status, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    );

    if (!$insert) {
        throw new Exception('Database prepare failed while inserting device.');
    }

    $insert->bind_param(
        'ssiisss',
        $deviceName,
        $deviceType,
        $campusId,
        $buildingId,
        $verificationId,
        $dataLink,
        $status
    );

    $insert->execute();
    $newDeviceId = $conn->insert_id;

    /*
    |--------------------------------------------------------------------------
    | Temporary dummy readings
    |--------------------------------------------------------------------------
    | These readings are only for demo dashboard average values.
    | Later you can remove this block and insert real sensor/API data.
    |--------------------------------------------------------------------------
    */

    $dummyReadings = [
        [220.50, 0.30, 66.15],
        [221.40, 0.34, 75.28],
        [219.80, 0.28, 61.54]
    ];

    $readingStmt = $conn->prepare(
        'INSERT INTO device_readings (device_id, voltage, ampere, watt)
         VALUES (?, ?, ?, ?)'
    );

    if (!$readingStmt) {
        throw new Exception('Database prepare failed while inserting dummy readings.');
    }

    foreach ($dummyReadings as $reading) {
        [$voltage, $ampere, $watt] = $reading;
        $readingStmt->bind_param('iddd', $newDeviceId, $voltage, $ampere, $watt);
        $readingStmt->execute();
    }

    $conn->commit();

    json_response(true, 'Device added successfully. All admins can see this device.', [
        'device_id' => (int)$newDeviceId
    ], 201);

} catch (Throwable $e) {
    $conn->rollback();

    json_response(false, 'Failed to add device.', [
        'error' => $e->getMessage()
    ], 500);
}