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

/*
|--------------------------------------------------------------------------
| Create / update level homepage as Room Manager page
|--------------------------------------------------------------------------
| Future level pages will automatically contain:
| - Add Rooms button
| - Added Rooms section
| - Room modal
| - room-app.js connection
|--------------------------------------------------------------------------
*/

function create_floor_homepage_if_missing($pageLink, $buildingVerificationId, $floorName) {
    $path = parse_url($pageLink, PHP_URL_PATH);

    if (!$path) {
        return;
    }

    $requiredPart = '/daffodil_smart_city/buildings/' . $buildingVerificationId . '/floors/';

    if (strpos($path, $requiredPart) === false) {
        return;
    }

    $documentRoot = rtrim(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']), '/');
    $fullPath = $documentRoot . $path;
    $fullPath = str_replace('\\', '/', $fullPath);

    if (substr($fullPath, -1) !== '/') {
        $fullPath .= '/';
    }

    if (!is_dir($fullPath)) {
        mkdir($fullPath, 0777, true);
    }

    $indexFile = $fullPath . 'index.html';

    /*
    |--------------------------------------------------------------------------
    | Existing page handling
    |--------------------------------------------------------------------------
    | If the page already has room manager code, do not overwrite.
    | If the page is old/static level page, replace it with room manager page.
    |--------------------------------------------------------------------------
    */

    if (file_exists($indexFile)) {
        $existingHtml = file_get_contents($indexFile);

        if (
            strpos($existingHtml, 'id="roomGrid"') !== false &&
            strpos($existingHtml, 'room-app.js') !== false
        ) {
            return;
        }
    }

    $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Level | Daffodil Smart City</title>
    <link rel="stylesheet" href="../../assets/css/style.css" />
</head>
<body class="building-page">
    <button class="burger-btn" id="burgerBtn" type="button" aria-label="Open menu" aria-expanded="false">
        ☰
    </button>

    <div class="sidebar-overlay" id="sidebarOverlay"></div>

    <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
            <div class="brand-mark small">⚡</div>
            <div>
                <h2>Level</h2>
                <span>Room Manager</span>
            </div>
        </div>

        <nav class="side-nav">
            <a href="../../../../">Daffodil Smart City</a>
            <a href="../../../../../electricity_frontend/dashboard.html">Admin Dashboard</a>
            <a href="../../">Building Home</a>
            <a href="./" class="active">Level Home</a>
        </nav>
    </aside>

    <main class="main-content">
        <div class="content-shell">
            <header class="topbar">
                <div class="topbar-title">
                    <p class="eyebrow">Level Home</p>
                    <h1 id="pageTitle">Level</h1>
                    <p class="muted" id="pageSubtitle">Add and manage rooms under this level.</p>
                </div>
            </header>

            <div id="pageAlert" class="alert hidden"></div>

            <section class="center-action-wrap">
                <button class="add-device-btn center-add-btn" id="addRoomBtn" type="button">
                    <span>+</span>
                    Add Rooms
                </button>
            </section>

            <section class="devices-panel">
                <div class="section-head">
                    <div>
                        <p class="eyebrow">Room Cards</p>
                        <h2>Added Rooms</h2>
                    </div>
                </div>

                <div class="device-grid" id="roomGrid"></div>
            </section>
        </div>
    </main>

    <div class="modal-overlay hidden" id="roomModal">
        <div class="modal-card">
            <div class="modal-head">
                <div>
                    <p class="eyebrow">Connect Room</p>
                    <h2>Add Room Homepage</h2>
                </div>

                <button class="modal-close-btn" id="modalCloseBtn" type="button" aria-label="Close modal">
                    ×
                </button>
            </div>

            <form id="roomForm" class="building-form" autocomplete="off">
                <div class="form-group">
                    <label for="roomName">Room Name</label>
                    <input
                        type="text"
                        id="roomName"
                        placeholder="Example: Room 101"
                        autocomplete="off"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="roomVerificationId">Verification ID</label>
                    <input
                        type="text"
                        id="roomVerificationId"
                        placeholder="Example: room_101"
                        autocomplete="off"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="roomPageLink">Homepage Link</label>
                    <input
                        type="text"
                        id="roomPageLink"
                        placeholder="Paste room homepage link"
                        autocomplete="off"
                        required
                    />
                </div>

                <div class="modal-actions">
                    <button class="btn-secondary" id="modalCancelBtn" type="button">
                        Cancel
                    </button>

                    <button class="add-device-btn" id="saveRoomBtn" type="submit">
                        Save Room
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script src="../../assets/js/room-app.js?v=room-manager-1"></script>
</body>
</html>';

    file_put_contents($indexFile, $html);
}

/*
|--------------------------------------------------------------------------
| Auth check
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION['admin_id'])) {
    send_json(false, 'Unauthorized. Please login first.', [], 401);
}

/*
|--------------------------------------------------------------------------
| Read JSON input
|--------------------------------------------------------------------------
*/

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    send_json(false, 'Invalid JSON request.', [], 400);
}

$buildingVerificationId = trim($input['building_verification_id'] ?? '');
$floorName = trim($input['floor_name'] ?? '');
$floorVerificationId = trim($input['floor_verification_id'] ?? '');
$pageLink = trim($input['page_link'] ?? '');

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

if ($buildingVerificationId === '') {
    send_json(false, 'Building verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $buildingVerificationId)) {
    send_json(false, 'Building verification ID can contain only lowercase letters, numbers, and underscore.', [], 422);
}

if ($floorName === '') {
    send_json(false, 'Level name is required.', [], 422);
}

if ($floorVerificationId === '') {
    send_json(false, 'Level verification ID is required.', [], 422);
}

if (!preg_match('/^[a-z0-9_]+$/', $floorVerificationId)) {
    send_json(false, 'Level verification ID can contain only lowercase letters, numbers, and underscore.', [], 422);
}

if ($pageLink === '') {
    send_json(false, 'Homepage link is required.', [], 422);
}

if (
    stripos($pageLink, 'javascript:') === 0 ||
    stripos($pageLink, 'data:') === 0
) {
    send_json(false, 'Invalid homepage link.', [], 422);
}

$pagePath = parse_url($pageLink, PHP_URL_PATH);

if (!$pagePath) {
    send_json(false, 'Invalid homepage link path.', [], 422);
}

$expectedPathPart = '/daffodil_smart_city/buildings/' . $buildingVerificationId . '/floors/' . $floorVerificationId . '/';

if (strpos($pagePath, $expectedPathPart) === false) {
    send_json(
        false,
        'Homepage link does not match this building and level verification ID. Expected path should contain: ' . $expectedPathPart,
        [],
        422
    );
}

/*
|--------------------------------------------------------------------------
| Check building_pages table
|--------------------------------------------------------------------------
| Current building page must exist in building_pages table.
|--------------------------------------------------------------------------
*/

$buildingStmt = $conn->prepare("
    SELECT id
    FROM building_pages
    WHERE verification_table = ?
      AND is_active = 1
    LIMIT 1
");

if (!$buildingStmt) {
    send_json(false, 'Database prepare failed while checking building_pages.', [
        'error' => $conn->error
    ], 500);
}

$buildingStmt->bind_param('s', $buildingVerificationId);
$buildingStmt->execute();

$buildingResult = $buildingStmt->get_result();

if ($buildingResult->num_rows !== 1) {
    send_json(false, 'This building was not found in building_pages table or it is inactive.', [], 404);
}

$buildingRow = $buildingResult->fetch_assoc();
$buildingPageId = (int) $buildingRow['id'];

/*
|--------------------------------------------------------------------------
| Check existing level
|--------------------------------------------------------------------------
*/

$checkStmt = $conn->prepare("
    SELECT id
    FROM floor_pages
    WHERE building_verification_id = ?
      AND floor_verification_id = ?
    LIMIT 1
");

if (!$checkStmt) {
    send_json(false, 'Database prepare failed while checking level.', [
        'error' => $conn->error
    ], 500);
}

$checkStmt->bind_param('ss', $buildingVerificationId, $floorVerificationId);
$checkStmt->execute();

$checkResult = $checkStmt->get_result();

/*
|--------------------------------------------------------------------------
| Update existing level
|--------------------------------------------------------------------------
*/

if ($checkResult->num_rows > 0) {
    $existing = $checkResult->fetch_assoc();
    $existingId = (int) $existing['id'];

    $updateStmt = $conn->prepare("
        UPDATE floor_pages
        SET
            building_page_id = ?,
            floor_name = ?,
            page_link = ?,
            is_active = 1
        WHERE id = ?
    ");

    if (!$updateStmt) {
        send_json(false, 'Database prepare failed while updating level.', [
            'error' => $conn->error
        ], 500);
    }

    $updateStmt->bind_param(
        'issi',
        $buildingPageId,
        $floorName,
        $pageLink,
        $existingId
    );

    if (!$updateStmt->execute()) {
        send_json(false, 'Failed to update level page.', [
            'error' => $updateStmt->error
        ], 500);
    }

    create_floor_homepage_if_missing($pageLink, $buildingVerificationId, $floorName);

    send_json(true, 'Level page updated successfully.', [
        'id' => $existingId
    ]);
}

/*
|--------------------------------------------------------------------------
| Insert new level
|--------------------------------------------------------------------------
*/

$insertStmt = $conn->prepare("
    INSERT INTO floor_pages
    (
        building_page_id,
        building_verification_id,
        floor_name,
        floor_verification_id,
        page_link,
        is_active
    )
    VALUES (?, ?, ?, ?, ?, 1)
");

if (!$insertStmt) {
    send_json(false, 'Database prepare failed while creating level.', [
        'error' => $conn->error
    ], 500);
}

$insertStmt->bind_param(
    'issss',
    $buildingPageId,
    $buildingVerificationId,
    $floorName,
    $floorVerificationId,
    $pageLink
);

if (!$insertStmt->execute()) {
    send_json(false, 'Failed to create level page.', [
        'error' => $insertStmt->error
    ], 500);
}

create_floor_homepage_if_missing($pageLink, $buildingVerificationId, $floorName);

send_json(true, 'Level page connected successfully.', [
    'id' => $conn->insert_id
], 201);