<?php

if (!function_exists('clean_admin_password')) {
    function clean_admin_password($value): string
    {
        return trim((string)$value);
    }
}

if (!function_exists('admin_password_matches')) {
    function admin_password_matches(mysqli $conn, string $password): bool
    {
        if (empty($_SESSION['admin_id'])) {
            return false;
        }

        if ($password === '') {
            return false;
        }

        $adminId = (int)$_SESSION['admin_id'];

        $stmt = $conn->prepare("SELECT password_hash FROM admins WHERE id = ? LIMIT 1");

        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('i', $adminId);

        if (!$stmt->execute()) {
            return false;
        }

        $result = $stmt->get_result();

        if ($result->num_rows !== 1) {
            return false;
        }

        $admin = $result->fetch_assoc();

        return password_verify($password, (string)$admin['password_hash']);
    }
}