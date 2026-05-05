<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');

$requiredTables = ['admins', 'campuses', 'buildings', 'devices', 'device_readings'];
$tables = [];

foreach ($requiredTables as $table) {
    $safeTable = $conn->real_escape_string($table);
    $result = $conn->query("SHOW TABLES LIKE '$safeTable'");
    $tables[$table] = ($result && $result->num_rows > 0) ? 'found' : 'missing';
}

$totalDevices = 0;
$result = $conn->query('SELECT COUNT(*) AS total_devices FROM devices');
if ($result) {
    $row = $result->fetch_assoc();
    $totalDevices = (int)$row['total_devices'];
}

json_response(true, 'Database test completed.', [
    'database' => 'electricity_demoweb',
    'tables' => $tables,
    'total_devices' => $totalDevices
]);
