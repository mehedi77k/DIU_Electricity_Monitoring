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

$campusTable = $_GET['campus_table'] ?? 'daffodil_smart_city';

$sql = "
    SELECT 
        id,
        campus_table,
        building_catalog_id,
        building_name,
        verification_table,
        page_link,
        is_active,
        created_at
    FROM building_pages
    WHERE campus_table = ?
      AND is_active = 1
    ORDER BY building_catalog_id ASC, id ASC
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    send_json(false, 'Database prepare failed.', [
        'error' => $conn->error
    ], 500);
}

$stmt->bind_param('s', $campusTable);
$stmt->execute();

$result = $stmt->get_result();

$buildings = [];

while ($row = $result->fetch_assoc()) {
    $buildings[] = [
        'id' => (int) $row['id'],
        'campus_table' => $row['campus_table'],
        'building_catalog_id' => (int) $row['building_catalog_id'],
        'building_name' => $row['building_name'],
        'verification_id' => $row['verification_table'],
        'page_link' => $row['page_link'],
        'is_active' => (int) $row['is_active'],
        'created_at' => $row['created_at']
    ];
}

send_json(true, 'Building pages loaded successfully.', [
    'buildings' => $buildings
]);