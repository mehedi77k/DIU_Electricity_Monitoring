<?php
require_once __DIR__ . '/../config/bootstrap.php';

require_method('POST');
require_admin();

$input = get_json_input();
$locationId = (int)($input['location_id'] ?? 0);

if ($locationId <= 0) {
    json_response(false, 'location_id is required.', [], 422);
}

$check = $conn->prepare("
    SELECT id
    FROM location_pages
    WHERE id = ?
    AND is_active = 1
    LIMIT 1
");

if (!$check) {
    json_response(false, 'Database prepare failed while checking location.', [], 500);
}

$check->bind_param('i', $locationId);
$check->execute();

$result = $check->get_result();

if ($result->num_rows !== 1) {
    json_response(false, 'Location homepage not found or already removed.', [], 404);
}

$stmt = $conn->prepare("
    UPDATE location_pages
    SET is_active = 0
    WHERE id = ?
    LIMIT 1
");

if (!$stmt) {
    json_response(false, 'Database prepare failed while removing location.', [], 500);
}

$stmt->bind_param('i', $locationId);

if (!$stmt->execute()) {
    json_response(false, 'Failed to remove location homepage.', [], 500);
}

json_response(true, 'Location homepage removed successfully.', [
    'location_id' => $locationId
]);