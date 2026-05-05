<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');
require_admin();

$input = get_json_input();
$deviceId = (int)($input['device_id'] ?? 0);

if ($deviceId <= 0) {
    json_response(false, 'device_id is required.', [], 422);
}

$check = $conn->prepare('SELECT id FROM devices WHERE id = ? AND is_active = 1 LIMIT 1');
$check->bind_param('i', $deviceId);
$check->execute();
if ($check->get_result()->num_rows !== 1) {
    json_response(false, 'Active device not found.', [], 404);
}

$voltage = round(mt_rand(21500, 22500) / 100, 2);
$ampere = round(mt_rand(10, 90) / 100, 2);
$watt = round($voltage * $ampere, 2);

$stmt = $conn->prepare('INSERT INTO device_readings (device_id, voltage, ampere, watt) VALUES (?, ?, ?, ?)');
$stmt->bind_param('iddd', $deviceId, $voltage, $ampere, $watt);
$stmt->execute();

json_response(true, 'Dummy reading inserted.', [
    'reading' => [
        'device_id' => $deviceId,
        'voltage' => $voltage,
        'ampere' => $ampere,
        'watt' => $watt
    ]
], 201);
