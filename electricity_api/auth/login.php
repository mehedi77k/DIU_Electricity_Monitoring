<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');

$input = get_json_input();
$email = clean_text($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

if ($email === '' || $password === '') {
    json_response(false, 'Email and password are required.', [], 422);
}

$stmt = $conn->prepare('SELECT id, name, email, password_hash, role FROM admins WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    json_response(false, 'Invalid email or password.', [], 401);
}

$admin = $result->fetch_assoc();

if (!password_verify($password, $admin['password_hash'])) {
    json_response(false, 'Invalid email or password.', [], 401);
}

session_regenerate_id(true);
$_SESSION['admin_id'] = (int)$admin['id'];
$_SESSION['admin_name'] = $admin['name'];
$_SESSION['admin_email'] = $admin['email'];
$_SESSION['admin_role'] = $admin['role'];

json_response(true, 'Login successful.', ['admin' => admin_payload()]);
