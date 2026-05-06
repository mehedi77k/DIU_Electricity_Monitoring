<?php

require_once __DIR__ . '/../config/bootstrap.php';

require_method('POST');
require_admin();

$input = get_json_input();

$type = strtolower(clean_text($input['type'] ?? ''));
$name = clean_text($input['name'] ?? '');
$verificationId = strtolower(clean_text($input['verification_id'] ?? ''));
$link = clean_text($input['link'] ?? '');

$campusTable = strtolower(clean_text($input['campus_table'] ?? 'daffodil_smart_city'));
$buildingVerificationId = strtolower(clean_text($input['building_verification_id'] ?? ''));
$levelVerificationId = strtolower(clean_text($input['level_verification_id'] ?? ''));

if ($type === '' || $name === '' || $verificationId === '') {
    json_response(false, 'Type, name, and verification ID are required.', [], 400);
}

if (!in_array($type, ['building', 'level', 'room'], true)) {
    json_response(false, 'Invalid entity type.', [], 400);
}

if (!valid_verification_id($verificationId)) {
    json_response(false, 'Verification ID must use lowercase letters, numbers, and underscore only.', [], 400);
}

function get_project_base_url_dynamic(): string
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

function normalize_link_dynamic(string $url): string
{
    return strtolower(rtrim(trim($url), '/') . '/');
}

function validate_link_or_reject(string $submittedLink, string $expectedLink): void
{
    if ($submittedLink === '') {
        return;
    }

    if (normalize_link_dynamic($submittedLink) !== normalize_link_dynamic($expectedLink)) {
        json_response(false, 'Submitted link does not match the expected system link.', [
            'expected_link' => $expectedLink,
            'submitted_link' => $submittedLink
        ], 400);
    }
}

function expected_building_link(string $baseUrl, string $campusTable, string $buildingId): string
{
    return $baseUrl . '/' . $campusTable . '/buildings/' . $buildingId . '/';
}

function expected_level_link(string $baseUrl, string $campusTable, string $buildingId, string $levelId): string
{
    return $baseUrl . '/' . $campusTable . '/buildings/' . $buildingId . '/floors/' . $levelId . '/';
}

function expected_room_link(string $baseUrl, string $campusTable, string $buildingId, string $levelId, string $roomId): string
{
    return $baseUrl . '/' . $campusTable . '/buildings/' . $buildingId . '/floors/' . $levelId . '/rooms/' . $roomId . '/';
}

function create_building(mysqli $conn, string $name, string $verificationId, string $link, string $campusTable): void
{
    $baseUrl = get_project_base_url_dynamic();

    $stmt = $conn->prepare("
        SELECT
            id,
            campus_table,
            building_name,
            building_verification_id
        FROM building_catalog
        WHERE campus_table = ?
          AND building_name = ?
          AND building_verification_id = ?
          AND is_active = 1
        LIMIT 1
    ");

    if (!$stmt) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $stmt->bind_param('sss', $campusTable, $name, $verificationId);
    $stmt->execute();

    $catalog = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$catalog) {
        json_response(false, 'Building verification failed. This building is not approved in building_catalog.', [], 400);
    }

    $expectedLink = expected_building_link(
        $baseUrl,
        $catalog['campus_table'],
        $catalog['building_verification_id']
    );

    validate_link_or_reject($link, $expectedLink);

    $check = $conn->prepare("
        SELECT id, is_active
        FROM building_pages
        WHERE verification_table = ?
        LIMIT 1
    ");

    if (!$check) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $check->bind_param('s', $verificationId);
    $check->execute();

    $existing = $check->get_result()->fetch_assoc();
    $check->close();

    if ($existing && (int)$existing['is_active'] === 1) {
        json_response(true, 'Building page is already active.', [
            'type' => 'building',
            'page_link' => $expectedLink
        ]);
    }

    if ($existing) {
        $update = $conn->prepare("
            UPDATE building_pages
            SET
                campus_table = ?,
                building_catalog_id = ?,
                building_name = ?,
                verification_table = ?,
                page_link = ?,
                is_active = 1
            WHERE id = ?
            LIMIT 1
        ");

        if (!$update) {
            json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
        }

        $catalogId = (int)$catalog['id'];
        $existingId = (int)$existing['id'];

        $update->bind_param(
            'sisssi',
            $catalog['campus_table'],
            $catalogId,
            $catalog['building_name'],
            $catalog['building_verification_id'],
            $expectedLink,
            $existingId
        );

        if (!$update->execute()) {
            json_response(false, 'Failed to activate building page.', ['error' => $update->error], 500);
        }

        $update->close();

        json_response(true, 'Building page activated successfully.', [
            'type' => 'building',
            'page_link' => $expectedLink
        ]);
    }

    $insert = $conn->prepare("
        INSERT INTO building_pages (
            campus_table,
            building_catalog_id,
            building_name,
            verification_table,
            page_link,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, 1)
    ");

    if (!$insert) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $catalogId = (int)$catalog['id'];

    $insert->bind_param(
        'sisss',
        $catalog['campus_table'],
        $catalogId,
        $catalog['building_name'],
        $catalog['building_verification_id'],
        $expectedLink
    );

    if (!$insert->execute()) {
        json_response(false, 'Failed to create building page.', ['error' => $insert->error], 500);
    }

    $insert->close();

    json_response(true, 'Building page created successfully.', [
        'type' => 'building',
        'page_link' => $expectedLink
    ]);
}

function create_level(mysqli $conn, string $name, string $verificationId, string $link, string $buildingVerificationId): void
{
    if ($buildingVerificationId === '') {
        json_response(false, 'Parent building is required for level creation.', [], 400);
    }

    if (!valid_verification_id($buildingVerificationId)) {
        json_response(false, 'Parent building verification ID is invalid.', [], 400);
    }

    $baseUrl = get_project_base_url_dynamic();

    $buildingStmt = $conn->prepare("
        SELECT
            id,
            campus_table,
            building_name,
            verification_table
        FROM building_pages
        WHERE verification_table = ?
          AND is_active = 1
        LIMIT 1
    ");

    if (!$buildingStmt) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $buildingStmt->bind_param('s', $buildingVerificationId);
    $buildingStmt->execute();

    $buildingPage = $buildingStmt->get_result()->fetch_assoc();
    $buildingStmt->close();

    if (!$buildingPage) {
        json_response(false, 'Parent building page is not active. Activate the building first.', [], 400);
    }

    $catalogStmt = $conn->prepare("
        SELECT
            id,
            building_verification_id,
            level_name,
            level_verification_id
        FROM level_catalog
        WHERE building_verification_id = ?
          AND level_name = ?
          AND level_verification_id = ?
          AND is_active = 1
        LIMIT 1
    ");

    if (!$catalogStmt) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $catalogStmt->bind_param('sss', $buildingVerificationId, $name, $verificationId);
    $catalogStmt->execute();

    $catalog = $catalogStmt->get_result()->fetch_assoc();
    $catalogStmt->close();

    if (!$catalog) {
        json_response(false, 'Level verification failed. This level is not approved in level_catalog for the selected building.', [], 400);
    }

    $expectedLink = expected_level_link(
        $baseUrl,
        $buildingPage['campus_table'],
        $buildingVerificationId,
        $verificationId
    );

    validate_link_or_reject($link, $expectedLink);

    $check = $conn->prepare("
        SELECT id, is_active
        FROM floor_pages
        WHERE building_verification_id = ?
          AND floor_verification_id = ?
        LIMIT 1
    ");

    if (!$check) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $check->bind_param('ss', $buildingVerificationId, $verificationId);
    $check->execute();

    $existing = $check->get_result()->fetch_assoc();
    $check->close();

    if ($existing && (int)$existing['is_active'] === 1) {
        json_response(true, 'Level page is already active.', [
            'type' => 'level',
            'page_link' => $expectedLink
        ]);
    }

    $buildingPageId = (int)$buildingPage['id'];

    if ($existing) {
        $update = $conn->prepare("
            UPDATE floor_pages
            SET
                building_page_id = ?,
                building_verification_id = ?,
                floor_name = ?,
                floor_verification_id = ?,
                page_link = ?,
                is_active = 1
            WHERE id = ?
            LIMIT 1
        ");

        if (!$update) {
            json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
        }

        $existingId = (int)$existing['id'];

        $update->bind_param(
            'issssi',
            $buildingPageId,
            $catalog['building_verification_id'],
            $catalog['level_name'],
            $catalog['level_verification_id'],
            $expectedLink,
            $existingId
        );

        if (!$update->execute()) {
            json_response(false, 'Failed to activate level page.', ['error' => $update->error], 500);
        }

        $update->close();

        json_response(true, 'Level page activated successfully.', [
            'type' => 'level',
            'page_link' => $expectedLink
        ]);
    }

    $insert = $conn->prepare("
        INSERT INTO floor_pages (
            building_page_id,
            building_verification_id,
            floor_name,
            floor_verification_id,
            page_link,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, 1)
    ");

    if (!$insert) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $insert->bind_param(
        'issss',
        $buildingPageId,
        $catalog['building_verification_id'],
        $catalog['level_name'],
        $catalog['level_verification_id'],
        $expectedLink
    );

    if (!$insert->execute()) {
        json_response(false, 'Failed to create level page.', ['error' => $insert->error], 500);
    }

    $insert->close();

    json_response(true, 'Level page created successfully.', [
        'type' => 'level',
        'page_link' => $expectedLink
    ]);
}

function create_room(mysqli $conn, string $name, string $verificationId, string $link, string $buildingVerificationId, string $levelVerificationId): void
{
    if ($buildingVerificationId === '' || $levelVerificationId === '') {
        json_response(false, 'Parent building and parent level are required for room creation.', [], 400);
    }

    if (!valid_verification_id($buildingVerificationId) || !valid_verification_id($levelVerificationId)) {
        json_response(false, 'Parent verification ID is invalid.', [], 400);
    }

    $baseUrl = get_project_base_url_dynamic();

    $floorStmt = $conn->prepare("
        SELECT
            fp.id AS floor_page_id,
            fp.building_verification_id,
            fp.floor_verification_id,
            bp.campus_table,
            bp.id AS building_page_id
        FROM floor_pages fp
        INNER JOIN building_pages bp
            ON bp.id = fp.building_page_id
        WHERE fp.building_verification_id = ?
          AND fp.floor_verification_id = ?
          AND fp.is_active = 1
          AND bp.is_active = 1
        LIMIT 1
    ");

    if (!$floorStmt) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $floorStmt->bind_param('ss', $buildingVerificationId, $levelVerificationId);
    $floorStmt->execute();

    $floorPage = $floorStmt->get_result()->fetch_assoc();
    $floorStmt->close();

    if (!$floorPage) {
        json_response(false, 'Parent level page is not active. Activate the level first.', [], 400);
    }

    $catalogStmt = $conn->prepare("
        SELECT
            id,
            building_verification_id,
            level_verification_id,
            room_name,
            room_verification_id
        FROM room_catalog
        WHERE building_verification_id = ?
          AND level_verification_id = ?
          AND room_name = ?
          AND room_verification_id = ?
          AND is_active = 1
        LIMIT 1
    ");

    if (!$catalogStmt) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $catalogStmt->bind_param(
        'ssss',
        $buildingVerificationId,
        $levelVerificationId,
        $name,
        $verificationId
    );

    $catalogStmt->execute();

    $catalog = $catalogStmt->get_result()->fetch_assoc();
    $catalogStmt->close();

    if (!$catalog) {
        json_response(false, 'Room verification failed. This room is not approved in room_catalog for the selected level.', [], 400);
    }

    $expectedLink = expected_room_link(
        $baseUrl,
        $floorPage['campus_table'],
        $buildingVerificationId,
        $levelVerificationId,
        $verificationId
    );

    validate_link_or_reject($link, $expectedLink);

    $check = $conn->prepare("
        SELECT id, is_active
        FROM room_pages
        WHERE building_verification_id = ?
          AND floor_verification_id = ?
          AND room_verification_id = ?
        LIMIT 1
    ");

    if (!$check) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $check->bind_param('sss', $buildingVerificationId, $levelVerificationId, $verificationId);
    $check->execute();

    $existing = $check->get_result()->fetch_assoc();
    $check->close();

    if ($existing && (int)$existing['is_active'] === 1) {
        json_response(true, 'Room page is already active.', [
            'type' => 'room',
            'page_link' => $expectedLink
        ]);
    }

    $floorPageId = (int)$floorPage['floor_page_id'];

    if ($existing) {
        $update = $conn->prepare("
            UPDATE room_pages
            SET
                floor_page_id = ?,
                building_verification_id = ?,
                floor_verification_id = ?,
                room_name = ?,
                room_verification_id = ?,
                page_link = ?,
                is_active = 1
            WHERE id = ?
            LIMIT 1
        ");

        if (!$update) {
            json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
        }

        $existingId = (int)$existing['id'];

        $update->bind_param(
            'isssssi',
            $floorPageId,
            $catalog['building_verification_id'],
            $catalog['level_verification_id'],
            $catalog['room_name'],
            $catalog['room_verification_id'],
            $expectedLink,
            $existingId
        );

        if (!$update->execute()) {
            json_response(false, 'Failed to activate room page.', ['error' => $update->error], 500);
        }

        $update->close();

        json_response(true, 'Room page activated successfully.', [
            'type' => 'room',
            'page_link' => $expectedLink
        ]);
    }

    $insert = $conn->prepare("
        INSERT INTO room_pages (
            floor_page_id,
            building_verification_id,
            floor_verification_id,
            room_name,
            room_verification_id,
            page_link,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, 1)
    ");

    if (!$insert) {
        json_response(false, 'Database prepare failed.', ['error' => $conn->error], 500);
    }

    $insert->bind_param(
        'isssss',
        $floorPageId,
        $catalog['building_verification_id'],
        $catalog['level_verification_id'],
        $catalog['room_name'],
        $catalog['room_verification_id'],
        $expectedLink
    );

    if (!$insert->execute()) {
        json_response(false, 'Failed to create room page.', ['error' => $insert->error], 500);
    }

    $insert->close();

    json_response(true, 'Room page created successfully.', [
        'type' => 'room',
        'page_link' => $expectedLink
    ]);
}

if ($type === 'building') {
    create_building($conn, $name, $verificationId, $link, $campusTable);
}

if ($type === 'level') {
    create_level($conn, $name, $verificationId, $link, $buildingVerificationId);
}

if ($type === 'room') {
    create_room($conn, $name, $verificationId, $link, $buildingVerificationId, $levelVerificationId);
}

json_response(false, 'Unhandled request.', [], 400);