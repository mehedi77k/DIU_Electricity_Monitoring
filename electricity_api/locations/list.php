<?php
require_once __DIR__ . '/../config/bootstrap.php';

require_method('GET');
require_admin();

$sql = "
    SELECT
        id,
        location_name,
        verification_table,
        page_link,
        created_at
    FROM location_pages
    WHERE is_active = 1
    ORDER BY created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    json_response(false, 'Failed to load location homepages.', [
        'error' => $conn->error
    ], 500);
}

$locations = [];

while ($row = $result->fetch_assoc()) {
    $locations[] = [
        'id' => (int)$row['id'],
        'location_name' => $row['location_name'],
        'verification_table' => $row['verification_table'],
        'page_link' => $row['page_link'],
        'created_at' => $row['created_at']
    ];
}

json_response(true, 'Location homepages loaded.', [
    'locations' => $locations
]);