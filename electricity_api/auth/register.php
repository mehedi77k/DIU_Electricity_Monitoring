<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_method('POST');

$input = get_json_input();

$name = clean_text($input['name'] ?? '');
$email = clean_text($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

if ($name === '' || $email === '' || $password === '') {
    json_response(false, 'Name, email and password are required.', [], 422);
}

if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
    json_response(false, 'Name must be between 2 and 100 characters.', [], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(false, 'Please enter a valid email address.', [], 422);
}

if (strlen($password) < 6) {
    json_response(false, 'Password must be at least 6 characters.', [], 422);
}

$check = $conn->prepare('SELECT id FROM admins WHERE email = ? LIMIT 1');

if (!$check) {
    json_response(false, 'Database prepare failed.', [], 500);
}

$check->bind_param('s', $email);
$check->execute();
$existing = $check->get_result();

if ($existing->num_rows > 0) {
    json_response(false, 'This email is already registered. Please login instead.', [], 409);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
$role = 'admin';

$stmt = $conn->prepare('INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)');

if (!$stmt) {
    json_response(false, 'Database prepare failed.', [], 500);
}

$stmt->bind_param('ssss', $name, $email, $passwordHash, $role);

if (!$stmt->execute()) {
    json_response(false, 'Registration failed. Please try again.', [], 500);
}

/*
|--------------------------------------------------------------------------
| Important:
| Do NOT create session here.
| Registration should only create the admin account.
| User must login manually after successful registration.
|--------------------------------------------------------------------------
*/

json_response(
    true,
    'Admin account created successfully. Please login now.',
    [
        'redirect' => 'login'
    ],
    201
);