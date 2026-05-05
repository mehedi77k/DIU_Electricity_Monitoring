<?php
require_once __DIR__ . '/config/bootstrap.php';
require_method('GET');

$name = 'Admin';
$email = 'admin@gmail.com';
$password = 'admin123';
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare('SELECT id FROM admins WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $adminId = (int)$row['id'];

    $update = $conn->prepare('UPDATE admins SET name = ?, password_hash = ?, role = "super_admin" WHERE id = ?');
    $update->bind_param('ssi', $name, $passwordHash, $adminId);
    $update->execute();

    json_response(true, 'Admin account updated successfully.', [
        'email' => $email,
        'password' => $password,
        'next' => 'Open http://localhost/electricity_frontend/index.html',
        'security' => 'Delete C:\\xampp\\htdocs\\electricity_api\\setup_admin.php after login works.'
    ]);
}

$insert = $conn->prepare('INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, "super_admin")');
$insert->bind_param('sss', $name, $email, $passwordHash);
$insert->execute();

json_response(true, 'Admin account created successfully.', [
    'email' => $email,
    'password' => $password,
    'next' => 'Open http://localhost/electricity_frontend/index.html',
    'security' => 'Delete C:\\xampp\\htdocs\\electricity_api\\setup_admin.php after login works.'
]);
