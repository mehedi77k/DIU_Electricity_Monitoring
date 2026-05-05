<?php
require_once __DIR__ . '/../config/bootstrap.php';

require_method('GET');
require_admin();

/*
|--------------------------------------------------------------------------
| Shared device list
|--------------------------------------------------------------------------
| This query does NOT filter by admin_id.
| So every active device is visible to every logged-in admin.
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT
        d.id,
        d.device_name,
        d.device_type,
        d.verification_id,
        d.data_link,
        d.status,
        d.created_at,
        c.campus_name,
        b.building_name,
        COALESCE(avg_data.average_voltage, 0) AS average_voltage,
        COALESCE(avg_data.average_ampere, 0) AS average_ampere,
        COALESCE(avg_data.average_watt, 0) AS average_watt,
        COALESCE(avg_data.total_readings, 0) AS total_readings,
        avg_data.last_recorded_at
    FROM devices d
    LEFT JOIN campuses c
        ON d.campus_id = c.id
    LEFT JOIN buildings b
        ON d.building_id = b.id
    LEFT JOIN (
        SELECT
            device_id,
            ROUND(AVG(voltage), 2) AS average_voltage,
            ROUND(AVG(ampere), 2) AS average_ampere,
            ROUND(AVG(watt), 2) AS average_watt,
            COUNT(*) AS total_readings,
            MAX(recorded_at) AS last_recorded_at
        FROM device_readings
        GROUP BY device_id
    ) avg_data
        ON d.id = avg_data.device_id
    WHERE d.is_active = 1
    ORDER BY d.created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    json_response(false, 'Failed to load devices.', [
        'error' => $conn->error
    ], 500);
}

$devices = [];

while ($row = $result->fetch_assoc()) {
    $devices[] = [
        'id' => (int)$row['id'],
        'device_name' => $row['device_name'],
        'device_type' => $row['device_type'],
        'verification_id' => $row['verification_id'],
        'data_link' => $row['data_link'],
        'status' => $row['status'],
        'campus_name' => $row['campus_name'],
        'building_name' => $row['building_name'],
        'average_voltage' => (float)$row['average_voltage'],
        'average_ampere' => (float)$row['average_ampere'],
        'average_watt' => (float)$row['average_watt'],
        'total_readings' => (int)$row['total_readings'],
        'last_recorded_at' => $row['last_recorded_at'],
        'created_at' => $row['created_at']
    ];
}

$totalDevices = count($devices);
$onlineDevices = 0;
$offlineDevices = 0;
$notInstalledDevices = 0;

$totalVoltage = 0;
$totalAmpere = 0;
$totalWatt = 0;

foreach ($devices as $device) {
    if ($device['status'] === 'online') {
        $onlineDevices++;
    } elseif ($device['status'] === 'offline') {
        $offlineDevices++;
    } elseif ($device['status'] === 'not_installed') {
        $notInstalledDevices++;
    }

    $totalVoltage += $device['average_voltage'];
    $totalAmpere += $device['average_ampere'];
    $totalWatt += $device['average_watt'];
}

$summary = [
    'total_devices' => $totalDevices,
    'online_devices' => $onlineDevices,
    'offline_devices' => $offlineDevices,
    'not_installed_devices' => $notInstalledDevices,
    'average_voltage' => $totalDevices ? round($totalVoltage / $totalDevices, 2) : 0,
    'average_ampere' => $totalDevices ? round($totalAmpere / $totalDevices, 2) : 0,
    'average_watt' => $totalDevices ? round($totalWatt / $totalDevices, 2) : 0
];

json_response(true, 'Devices loaded.', [
    'summary' => $summary,
    'devices' => $devices
]);