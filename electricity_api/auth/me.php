<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_method('GET');

if (empty($_SESSION['admin_id'])) {
    json_response(false, 'Not logged in.', ['authenticated' => false], 401);
}

json_response(true, 'Authenticated.', [
    'authenticated' => true,
    'admin' => admin_payload()
]);
