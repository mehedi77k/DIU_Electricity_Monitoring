<?php
// Shared bootstrap for every API endpoint.
// Keep this folder at: C:\xampp\htdocs\electricity_api\

ini_set('display_errors', '0');
error_reporting(E_ALL);

// Make the session cookie available for both /electricity_frontend and /electricity_api paths.
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// These headers keep API responses JSON based and allow local frontend calls.
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
