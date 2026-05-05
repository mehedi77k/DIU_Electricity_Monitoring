<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');
require_admin();

$result = $conn->query('SELECT id, campus_name FROM campuses ORDER BY campus_name ASC');
$campuses = [];
while ($row = $result->fetch_assoc()) {
    $campuses[] = [
        'id' => (int)$row['id'],
        'campus_name' => $row['campus_name']
    ];
}

json_response(true, 'Campuses loaded.', ['campuses' => $campuses]);
