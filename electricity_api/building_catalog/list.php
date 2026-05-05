<?php
require_once __DIR__ . '/../config/bootstrap.php';

function dynamic_catalog_response(bool $status, string $message, array $data = [], int $httpCode = 200): void
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    dynamic_catalog_response(false, 'Only GET request is allowed.', [], 405);
}

$campusTable = trim((string)($_GET['campus_table'] ?? 'daffodil_smart_city'));

if ($campusTable === '') {
    dynamic_catalog_response(false, 'Campus table is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]{3,100}$/', $campusTable)) {
    dynamic_catalog_response(false, 'Invalid campus table.', [], 422);
}

$stmt = $conn->prepare(" 
    SELECT id, campus_table, building_name, building_verification_id, is_active
    FROM building_catalog
    WHERE campus_table = ?
      AND is_active = 1
    ORDER BY id ASC, building_name ASC
");

if (!$stmt) {
    dynamic_catalog_response(false, 'Database prepare failed while loading building catalog.', [
        'error' => $conn->error,
    ], 500);
}

$stmt->bind_param('s', $campusTable);
$stmt->execute();
$result = $stmt->get_result();

$buildings = [];
while ($row = $result->fetch_assoc()) {
    $buildings[] = [
        'id' => (int)$row['id'],
        'campus_table' => $row['campus_table'],
        'name' => $row['building_name'],
        'building_name' => $row['building_name'],
        'slug' => $row['building_verification_id'],
        'verification_id' => $row['building_verification_id'],
        'is_active' => (int)$row['is_active'],
    ];
}

dynamic_catalog_response(true, 'Building catalog loaded successfully.', [
    'buildings' => $buildings,
]);
