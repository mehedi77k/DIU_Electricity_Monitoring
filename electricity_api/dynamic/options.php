<?php

require_once __DIR__ . '/../config/bootstrap.php';

require_method('GET');
require_admin();

function fetch_rows(mysqli $conn, string $sql): array
{
    $result = $conn->query($sql);

    if (!$result) {
        json_response(false, 'Database query failed.', [
            'error' => $conn->error
        ], 500);
    }

    $rows = [];

    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }

    return $rows;
}

function get_project_base_url_for_dynamic(): string
{
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';

    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';

    $marker = '/electricity_api/';
    $pos = strpos($scriptName, $marker);

    if ($pos !== false) {
        $basePath = substr($scriptName, 0, $pos);
    } else {
        $basePath = '';
    }

    return rtrim($scheme . '://' . $host . $basePath, '/');
}

$activeBuildings = fetch_rows($conn, "
    SELECT
        bp.id AS building_page_id,
        bp.campus_table,
        bp.building_name,
        bp.verification_table AS building_verification_id,
        bp.page_link
    FROM building_pages bp
    INNER JOIN building_catalog bc
        ON bc.id = bp.building_catalog_id
    WHERE bp.is_active = 1
      AND bc.is_active = 1
    ORDER BY bp.building_name ASC
");

$activeLevels = fetch_rows($conn, "
    SELECT
        fp.id AS floor_page_id,
        fp.building_page_id,
        fp.building_verification_id,
        fp.floor_name,
        fp.floor_verification_id,
        fp.page_link
    FROM floor_pages fp
    INNER JOIN building_pages bp
        ON bp.id = fp.building_page_id
    WHERE fp.is_active = 1
      AND bp.is_active = 1
    ORDER BY fp.building_verification_id ASC, fp.floor_name ASC
");

$activeRooms = fetch_rows($conn, "
    SELECT
        rp.id AS room_page_id,
        rp.floor_page_id,
        rp.building_verification_id,
        rp.floor_verification_id,
        rp.room_name,
        rp.room_verification_id,
        rp.page_link
    FROM room_pages rp
    INNER JOIN floor_pages fp
        ON fp.id = rp.floor_page_id
    INNER JOIN building_pages bp
        ON bp.id = fp.building_page_id
    WHERE rp.is_active = 1
      AND fp.is_active = 1
      AND bp.is_active = 1
    ORDER BY rp.building_verification_id ASC, rp.floor_verification_id ASC, rp.room_name ASC
");

$buildingCatalog = fetch_rows($conn, "
    SELECT
        bc.id,
        bc.campus_table,
        bc.building_name,
        bc.building_verification_id,
        bc.is_active,
        bp.id AS building_page_id,
        bp.page_link AS page_link,
        COALESCE(bp.is_active, 0) AS page_is_active
    FROM building_catalog bc
    LEFT JOIN building_pages bp
        ON bp.campus_table = bc.campus_table
       AND bp.verification_table = bc.building_verification_id
    WHERE bc.is_active = 1
    ORDER BY bc.building_name ASC
");

$levelCatalog = fetch_rows($conn, "
    SELECT
        lc.id,
        lc.building_verification_id,
        lc.level_name,
        lc.level_verification_id,
        lc.is_active,
        bp.id AS parent_building_page_id,
        bp.campus_table,
        bp.building_name,
        COALESCE(bp.is_active, 0) AS parent_building_is_active,
        fp.id AS floor_page_id,
        fp.page_link AS page_link,
        COALESCE(fp.is_active, 0) AS page_is_active
    FROM level_catalog lc
    LEFT JOIN building_pages bp
        ON bp.verification_table = lc.building_verification_id
    LEFT JOIN floor_pages fp
        ON fp.building_verification_id = lc.building_verification_id
       AND fp.floor_verification_id = lc.level_verification_id
    WHERE lc.is_active = 1
    ORDER BY lc.building_verification_id ASC, lc.level_name ASC
");

$roomCatalog = fetch_rows($conn, "
    SELECT
        rc.id,
        rc.building_verification_id,
        rc.level_verification_id,
        rc.room_name,
        rc.room_verification_id,
        rc.is_active,
        fp.id AS parent_floor_page_id,
        COALESCE(fp.is_active, 0) AS parent_floor_is_active,
        rp.id AS room_page_id,
        rp.page_link AS page_link,
        COALESCE(rp.is_active, 0) AS page_is_active
    FROM room_catalog rc
    LEFT JOIN floor_pages fp
        ON fp.building_verification_id = rc.building_verification_id
       AND fp.floor_verification_id = rc.level_verification_id
    LEFT JOIN room_pages rp
        ON rp.building_verification_id = rc.building_verification_id
       AND rp.floor_verification_id = rc.level_verification_id
       AND rp.room_verification_id = rc.room_verification_id
    WHERE rc.is_active = 1
    ORDER BY rc.building_verification_id ASC, rc.level_verification_id ASC, rc.room_name ASC
");

json_response(true, 'Dynamic options loaded successfully.', [
    'base_url' => get_project_base_url_for_dynamic(),
    'active_buildings' => $activeBuildings,
    'active_levels' => $activeLevels,
    'active_rooms' => $activeRooms,
    'building_catalog' => $buildingCatalog,
    'level_catalog' => $levelCatalog,
    'room_catalog' => $roomCatalog
]);