<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
require_admin();

$campusId = (int)($_GET['campus_id'] ?? 0);

if ($campusId <= 0) {
    json_response(false, 'campus_id is required.', [], 422);
}

$stmt = $conn->prepare('SELECT id, building_name FROM buildings WHERE campus_id = ? ORDER BY building_name ASC');
$stmt->bind_param('i', $campusId);
$stmt->execute();
$result = $stmt->get_result();

$buildings = [];
while ($row = $result->fetch_assoc()) {
    $buildings[] = [
        'id' => (int)$row['id'],
        'building_name' => $row['building_name']
    ];
}

json_response(true, 'Buildings loaded.', ['buildings' => $buildings]);
