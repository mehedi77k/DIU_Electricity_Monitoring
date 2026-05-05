<?php
require_once __DIR__ . '/../config/bootstrap.php';

require_method('POST');
require_admin();

$input = get_json_input();
$deviceId = (int)($input['device_id'] ?? 0);

if ($deviceId <= 0) {
    json_response(false, 'device_id is required.', [], 422);
}

/*
|--------------------------------------------------------------------------
| Check device first
|--------------------------------------------------------------------------
| We only remove active devices.
|--------------------------------------------------------------------------
*/

$check = $conn->prepare('SELECT id FROM devices WHERE id = ? AND is_active = 1 LIMIT 1');

if (!$check) {
    json_response(false, 'Database prepare failed while checking device.', [], 500);
}

$check->bind_param('i', $deviceId);
$check->execute();

$result = $check->get_result();

if ($result->num_rows !== 1) {
    json_response(false, 'Device not found or already removed.', [], 404);
}

/*
|--------------------------------------------------------------------------
| Soft delete
|--------------------------------------------------------------------------
| Device permanently delete না করে is_active = 0 করা হচ্ছে.
| কারণ list.php শুধু is_active = 1 device দেখায়.
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare('UPDATE devices SET is_active = 0, status = "offline" WHERE id = ? LIMIT 1');

if (!$stmt) {
    json_response(false, 'Database prepare failed while removing device.', [], 500);
}

$stmt->bind_param('i', $deviceId);

if (!$stmt->execute()) {
    json_response(false, 'Failed to remove device.', [], 500);
}

if ($stmt->affected_rows < 1) {
    json_response(false, 'Device not found or already removed.', [], 404);
}

json_response(true, 'Device removed successfully.', [
    'device_id' => $deviceId
]);