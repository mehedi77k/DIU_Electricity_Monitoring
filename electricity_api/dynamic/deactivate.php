<?php

require_once __DIR__ . '/../config/bootstrap.php';

require_method('POST');
require_admin();

$input = get_json_input();

$type = strtolower(clean_text($input['type'] ?? ''));
$id = (int)($input['id'] ?? 0);

if (!in_array($type, ['building', 'level', 'room'], true)) {
    json_response(false, 'Invalid entity type.', [], 400);
}

if ($id <= 0) {
    json_response(false, 'Invalid record ID.', [], 400);
}

$conn->begin_transaction();

try {
    if ($type === 'building') {
        $stmt = $conn->prepare("
            SELECT verification_table
            FROM building_pages
            WHERE id = ?
            LIMIT 1
        ");

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $building = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$building) {
            throw new Exception('Building page not found.');
        }

        $buildingVerificationId = $building['verification_table'];

        $updateRooms = $conn->prepare("
            UPDATE room_pages
            SET is_active = 0
            WHERE building_verification_id = ?
        ");

        if (!$updateRooms) {
            throw new Exception($conn->error);
        }

        $updateRooms->bind_param('s', $buildingVerificationId);
        $updateRooms->execute();
        $updateRooms->close();

        $updateLevels = $conn->prepare("
            UPDATE floor_pages
            SET is_active = 0
            WHERE building_verification_id = ?
        ");

        if (!$updateLevels) {
            throw new Exception($conn->error);
        }

        $updateLevels->bind_param('s', $buildingVerificationId);
        $updateLevels->execute();
        $updateLevels->close();

        $updateBuilding = $conn->prepare("
            UPDATE building_pages
            SET is_active = 0
            WHERE id = ?
            LIMIT 1
        ");

        if (!$updateBuilding) {
            throw new Exception($conn->error);
        }

        $updateBuilding->bind_param('i', $id);
        $updateBuilding->execute();
        $updateBuilding->close();

        $conn->commit();

        json_response(true, 'Building, its levels, and its rooms were deactivated.');
    }

    if ($type === 'level') {
        $stmt = $conn->prepare("
            SELECT building_verification_id, floor_verification_id
            FROM floor_pages
            WHERE id = ?
            LIMIT 1
        ");

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $level = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$level) {
            throw new Exception('Level page not found.');
        }

        $buildingVerificationId = $level['building_verification_id'];
        $floorVerificationId = $level['floor_verification_id'];

        $updateRooms = $conn->prepare("
            UPDATE room_pages
            SET is_active = 0
            WHERE building_verification_id = ?
              AND floor_verification_id = ?
        ");

        if (!$updateRooms) {
            throw new Exception($conn->error);
        }

        $updateRooms->bind_param('ss', $buildingVerificationId, $floorVerificationId);
        $updateRooms->execute();
        $updateRooms->close();

        $updateLevel = $conn->prepare("
            UPDATE floor_pages
            SET is_active = 0
            WHERE id = ?
            LIMIT 1
        ");

        if (!$updateLevel) {
            throw new Exception($conn->error);
        }

        $updateLevel->bind_param('i', $id);
        $updateLevel->execute();
        $updateLevel->close();

        $conn->commit();

        json_response(true, 'Level and its rooms were deactivated.');
    }

    if ($type === 'room') {
        $stmt = $conn->prepare("
            UPDATE room_pages
            SET is_active = 0
            WHERE id = ?
            LIMIT 1
        ");

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        $conn->commit();

        json_response(true, 'Room was deactivated.');
    }
} catch (Exception $e) {
    $conn->rollback();

    json_response(false, $e->getMessage(), [], 500);
}

json_response(false, 'Request could not be completed.', [], 400);