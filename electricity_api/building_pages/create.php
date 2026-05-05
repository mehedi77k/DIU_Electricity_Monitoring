<?php
require_once __DIR__ . '/../config/bootstrap.php';

function dynamic_page_response(bool $status, string $message, array $data = [], int $httpCode = 200): void
{
    http_response_code($httpCode);
    echo json_encode([
        'status' => $status,
        'success' => $status,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function dynamic_clean($value): string
{
    return trim((string)$value);
}

function dynamic_valid_slug(string $value, int $max = 150): bool
{
    return (bool)preg_match('/^[a-z0-9_]{2,' . $max . '}$/', $value);
}

function dynamic_safe_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function dynamic_validate_page_link(string $pageLink, string $expectedPathPart): void
{
    if ($pageLink === '') {
        dynamic_page_response(false, 'Homepage link is required.', [], 422);
    }

    if (stripos($pageLink, 'javascript:') === 0 || stripos($pageLink, 'data:') === 0) {
        dynamic_page_response(false, 'Invalid homepage link.', [], 422);
    }

    $pagePath = parse_url($pageLink, PHP_URL_PATH);
    if (!$pagePath) {
        dynamic_page_response(false, 'Invalid homepage link path.', [], 422);
    }

    if (strpos($pagePath, $expectedPathPart) === false) {
        dynamic_page_response(
            false,
            'Homepage link does not match this verification ID. Expected path should contain: ' . $expectedPathPart,
            [],
            422
        );
    }
}

function dynamic_ensure_directory_from_link(string $pageLink): ?string
{
    $pagePath = parse_url($pageLink, PHP_URL_PATH);
    if (!$pagePath) {
        return null;
    }

    $documentRoot = rtrim(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
    if ($documentRoot === '') {
        return null;
    }

    $fullPath = $documentRoot . $pagePath;
    $fullPath = str_replace('\\', '/', $fullPath);

    if (substr($fullPath, -1) !== '/') {
        $fullPath .= '/';
    }

    if (!is_dir($fullPath)) {
        mkdir($fullPath, 0777, true);
    }

    return $fullPath;
}

function create_building_homepage_if_missing(string $pageLink, string $buildingVerificationId, string $buildingName): void
{
    $fullPath = dynamic_ensure_directory_from_link($pageLink);
    if (!$fullPath) {
        return;
    }

    $indexFile = $fullPath . 'index.html';
    if (file_exists($indexFile)) {
        return;
    }

    $safeBuildingName = dynamic_safe_html($buildingName);

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$safeBuildingName} | Daffodil Smart City</title>
  <link rel="stylesheet" href="../../assets/css/style.css">
</head>
<body>
  <button class="burger-btn" id="burgerBtn" aria-label="Toggle menu" aria-expanded="false">☰</button>
  <div class="sidebar-overlay" id="sidebarOverlay"></div>
  <aside class="sidebar" id="sidebar">
    <div class="brand"><span class="brand-icon">⚡</span><div><h2>Daffodil Smart City</h2><p>Level Manager</p></div></div>
    <nav class="nav-links">
      <a href="../../index.html">Daffodil Smart City</a>
      <a href="../../../electricity_frontend/dashboard.html">Admin Dashboard</a>
      <a href="index.html">Building Home</a>
    </nav>
  </aside>

  <main class="main-content">
    <section class="page-header">
      <p class="eyebrow">Building Home</p>
      <h1 id="buildingTitle">{$safeBuildingName}</h1>
      <p>Add and manage levels under this building.</p>
      <button class="primary-btn" id="addLevelBtn">+ Add Levels</button>
    </section>

    <div id="pageAlert" class="alert hidden"></div>

    <section class="devices-section">
      <div class="section-heading"><div><p class="eyebrow">Level Cards</p><h2>Added Levels</h2></div></div>
      <div class="device-grid" id="levelGrid"></div>
    </section>
  </main>

  <div class="modal hidden" id="levelModal" role="dialog" aria-modal="true">
    <div class="modal-card">
      <div class="modal-header"><h2>Add Level Homepage</h2><button type="button" class="icon-btn" id="modalCloseBtn">×</button></div>
      <form id="levelForm" class="modal-form">
        <label class="suggest-wrap">Level Name
          <input type="text" id="levelName" autocomplete="off" required>
          <div id="levelNameSuggestions" class="black-suggestions hidden"></div>
        </label>
        <label class="suggest-wrap">Verification ID
          <input type="text" id="levelVerificationId" autocomplete="off" required>
          <div id="levelVerificationSuggestions" class="black-suggestions hidden"></div>
        </label>
        <label class="suggest-wrap">Homepage Link
          <input type="url" id="levelPageLink" autocomplete="off" required>
          <div id="levelPageLinkSuggestions" class="black-suggestions hidden"></div>
        </label>
        <div class="modal-actions"><button type="button" class="secondary-btn" id="modalCancelBtn">Cancel</button><button type="submit" class="primary-btn" id="saveLevelBtn">Save Level</button></div>
      </form>
    </div>
  </div>

  <script src="../../assets/js/building-page.js"></script>
</body>
</html>
HTML;

    file_put_contents($indexFile, $html);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    dynamic_page_response(false, 'Only POST request is allowed.', [], 405);
}

if (empty($_SESSION['admin_id'])) {
    dynamic_page_response(false, 'Unauthorized. Please login from Admin Dashboard first.', [], 401);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    dynamic_page_response(false, 'Invalid JSON request.', [], 400);
}

$campusTable = dynamic_clean($input['campus_table'] ?? 'daffodil_smart_city');
$buildingName = dynamic_clean($input['building_name'] ?? '');
$verificationId = dynamic_clean($input['verification_id'] ?? '');
$pageLink = dynamic_clean($input['page_link'] ?? '');

if ($campusTable === '' || !dynamic_valid_slug($campusTable, 100)) {
    dynamic_page_response(false, 'Invalid campus table.', [], 422);
}

if ($buildingName === '') {
    dynamic_page_response(false, 'Building name is required.', [], 422);
}

if ($verificationId === '' || !dynamic_valid_slug($verificationId, 150)) {
    dynamic_page_response(false, 'Verification ID can contain only lowercase letters, numbers, and underscore.', [], 422);
}

$expectedPathPart = '/daffodil_smart_city/buildings/' . $verificationId . '/';
dynamic_validate_page_link($pageLink, $expectedPathPart);

$catalogStmt = $conn->prepare(" 
    SELECT id
    FROM building_catalog
    WHERE campus_table = ?
      AND building_name = ?
      AND building_verification_id = ?
      AND is_active = 1
    LIMIT 1
");

if (!$catalogStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking building_catalog.', [
        'error' => $conn->error,
    ], 500);
}

$catalogStmt->bind_param('sss', $campusTable, $buildingName, $verificationId);
$catalogStmt->execute();
$catalogResult = $catalogStmt->get_result();

if ($catalogResult->num_rows !== 1) {
    dynamic_page_response(
        false,
        'Building was not found in building_catalog. Check Building Name and Verification ID.',
        [],
        404
    );
}

$catalogRow = $catalogResult->fetch_assoc();
$buildingCatalogId = (int)$catalogRow['id'];

$checkStmt = $conn->prepare(" 
    SELECT id
    FROM building_pages
    WHERE campus_table = ?
      AND (building_name = ? OR verification_table = ?)
    LIMIT 1
");

if (!$checkStmt) {
    dynamic_page_response(false, 'Database prepare failed while checking existing building page.', [
        'error' => $conn->error,
    ], 500);
}

$checkStmt->bind_param('sss', $campusTable, $buildingName, $verificationId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    $existing = $checkResult->fetch_assoc();
    $existingId = (int)$existing['id'];

    $updateStmt = $conn->prepare(" 
        UPDATE building_pages
        SET building_catalog_id = ?,
            building_name = ?,
            verification_table = ?,
            page_link = ?,
            is_active = 1
        WHERE id = ?
        LIMIT 1
    ");

    if (!$updateStmt) {
        dynamic_page_response(false, 'Database prepare failed while updating building page.', [
            'error' => $conn->error,
        ], 500);
    }

    $updateStmt->bind_param('isssi', $buildingCatalogId, $buildingName, $verificationId, $pageLink, $existingId);

    if (!$updateStmt->execute()) {
        dynamic_page_response(false, 'Failed to update building page.', [
            'error' => $updateStmt->error,
        ], 500);
    }

    create_building_homepage_if_missing($pageLink, $verificationId, $buildingName);

    dynamic_page_response(true, 'Building page updated successfully.', [
        'id' => $existingId,
    ]);
}

$insertStmt = $conn->prepare(" 
    INSERT INTO building_pages
      (campus_table, building_catalog_id, building_name, verification_table, page_link, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
");

if (!$insertStmt) {
    dynamic_page_response(false, 'Database prepare failed while creating building page.', [
        'error' => $conn->error,
    ], 500);
}

$insertStmt->bind_param('sisss', $campusTable, $buildingCatalogId, $buildingName, $verificationId, $pageLink);

if (!$insertStmt->execute()) {
    dynamic_page_response(false, 'Failed to create building page.', [
        'error' => $insertStmt->error,
    ], 500);
}

create_building_homepage_if_missing($pageLink, $verificationId, $buildingName);

dynamic_page_response(true, 'Building page connected successfully.', [
    'id' => (int)$conn->insert_id,
], 201);
