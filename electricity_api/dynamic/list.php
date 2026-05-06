<?php

require_once __DIR__ . '/../config/bootstrap.php';

require_method('GET');
require_admin();

function fetch_rows(mysqli $conn, string $sql, string $message): array
{
    $result = $conn->query($sql);

    if (!$result) {
        json_response(false, $message, [
            'error' => $conn->error
        ], 500);
    }

    $rows = [];

    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }

    return $rows;
}

$buildings = fetch_rows(
    $conn,
    "
    SELECT
        building_page_id AS id,
        campus_table,
        building_name,
        building_verification_id,
        page_link,
        created_at,
        updated_at
    FROM vw_active_building_pages
    ORDER BY building_name ASC
    ",
    "Failed to load buildings."
);

$levels = fetch_rows(
    $conn,
    "
    SELECT
        floor_page_id AS id,
        building_page_id,
        building_verification_id,
        floor_name,
        floor_verification_id,
        page_link,
        created_at,
        updated_at
    FROM vw_active_floor_pages
    ORDER BY building_verification_id ASC, floor_name ASC
    ",
    "Failed to load levels."
);

$rooms = fetch_rows(
    $conn,
    "
    SELECT
        room_page_id AS id,
        floor_page_id,
        building_verification_id,
        floor_verification_id,
        room_name,
        room_verification_id,
        page_link,
        created_at,
        updated_at
    FROM vw_active_room_pages
    ORDER BY building_verification_id ASC, floor_verification_id ASC, room_name ASC
    ",
    "Failed to load rooms."
);

json_response(true, "Dynamic hierarchy loaded.", [
    "buildings" => $buildings,
    "levels" => $levels,
    "rooms" => $rooms
]);