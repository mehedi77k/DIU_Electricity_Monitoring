<?php
require_once __DIR__ . '/config/bootstrap.php';

require_method('GET');

$name = 'Admin';
$email = 'admin@gmail.com';
$password = 'admin123';
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$frontendLoginUrl = 'http://localhost/diu_electricity_monitoring/electricity_frontend/index.html';
$securityNote = 'Delete C:\\xampp\\htdocs\\diu_electricity_monitoring\\electricity_api\\setup_admin.php after login works.';

$stmt = $conn->prepare('SELECT id FROM admins WHERE email = ? LIMIT 1');

if (!$stmt) {
    json_response(false, 'Database prepare failed while checking admin.', [
        'error' => $conn->error
    ], 500);
}

$stmt->bind_param('s', $email);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $adminId = (int)$row['id'];

    $update = $conn->prepare('UPDATE admins SET name = ?, password_hash = ?, role = "super_admin" WHERE id = ?');

    if (!$update) {
        json_response(false, 'Database prepare failed while updating admin.', [
            'error' => $conn->error
        ], 500);
    }

    $update->bind_param('ssi', $name, $passwordHash, $adminId);

    if (!$update->execute()) {
        json_response(false, 'Failed to update admin account.', [
            'error' => $update->error
        ], 500);
    }

    json_response(true, 'Admin account updated successfully.', [
        'email' => $email,
        'password' => $password,
        'next' => 'Open ' . $frontendLoginUrl,
        'security' => $securityNote
    ]);
}

$insert = $conn->prepare('INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, "super_admin")');

if (!$insert) {
    json_response(false, 'Database prepare failed while creating admin.', [
        'error' => $conn->error
    ], 500);
}

$insert->bind_param('sss', $name, $email, $passwordHash);

if (!$insert->execute()) {
    json_response(false, 'Failed to create admin account.', [
        'error' => $insert->error
    ], 500);
}

json_response(true, 'Admin account created successfully.', [
    'email' => $email,
    'password' => $password,
    'next' => 'Open ' . $frontendLoginUrl,
    'security' => $securityNote
]);