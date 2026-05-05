<?php
function json_response(bool $success, string $message, array $data = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function get_json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(false, 'Invalid JSON body.', [], 400);
    }

    return $data;
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        json_response(false, 'Invalid request method. Use ' . strtoupper($method) . '.', [], 405);
    }
}

function require_admin(): void
{
    if (empty($_SESSION['admin_id'])) {
        json_response(false, 'Unauthorized. Please login first.', [], 401);
    }
}

function clean_text(?string $value): string
{
    return trim((string)$value);
}

function valid_verification_id(string $value): bool
{
    return (bool)preg_match('/^[a-z0-9_]{3,100}$/', $value);
}

function admin_payload(): array
{
    return [
        'id' => (int)($_SESSION['admin_id'] ?? 0),
        'name' => $_SESSION['admin_name'] ?? '',
        'email' => $_SESSION['admin_email'] ?? '',
        'role' => $_SESSION['admin_role'] ?? ''
    ];
}
