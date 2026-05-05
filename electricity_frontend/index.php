<?php
require_once __DIR__ . '/config/bootstrap.php';
json_response(true, 'Electricity DemoWeb API is running.', [
    'test_db' => 'http://localhost/electricity_api/system/test_db.php',
    'setup_admin' => 'http://localhost/electricity_api/setup_admin.php',
    'frontend' => 'http://localhost/electricity_frontend/index.html'
]);
