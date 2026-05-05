CREATE DATABASE IF NOT EXISTS electricity_demoweb
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE electricity_demoweb;

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campus_name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campus_id INT NOT NULL,
    building_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_building_campus
        FOREIGN KEY (campus_id)
        REFERENCES campuses(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_name VARCHAR(150) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    campus_id INT NOT NULL,
    building_id INT NOT NULL,
    verification_id VARCHAR(100) NOT NULL UNIQUE,
    data_link VARCHAR(500) NOT NULL,
    status ENUM('online', 'offline', 'not_installed') DEFAULT 'offline',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_device_campus
        FOREIGN KEY (campus_id)
        REFERENCES campuses(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_device_building
        FOREIGN KEY (building_id)
        REFERENCES buildings(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    voltage DECIMAL(10,2) DEFAULT 0.00,
    ampere DECIMAL(10,2) DEFAULT 0.00,
    watt DECIMAL(10,2) DEFAULT 0.00,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reading_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE,
    INDEX idx_device_recorded_at (device_id, recorded_at)
);

INSERT IGNORE INTO campuses (id, campus_name) VALUES
(1, 'Daffodil Smart City'),
(2, 'Daffodil UAE Campus');

INSERT IGNORE INTO buildings (id, campus_id, building_name) VALUES
(1, 1, 'Knowledge Tower'),
(2, 1, 'Scholars Home'),
(3, 1, 'Admission Building'),
(4, 1, 'Engineering Complex'),
(5, 1, 'YKSG'),
(6, 1, 'RASG'),
(7, 2, 'UAE Main Campus');

INSERT INTO devices (
    device_name,
    device_type,
    campus_id,
    building_id,
    verification_id,
    data_link,
    status
)
SELECT
    'Knowledge Tower Main Meter',
    'Smart Meter',
    1,
    1,
    'knowledge_tower_meter_01',
    'http://localhost/device/knowledge_tower_meter_01',
    'online'
WHERE NOT EXISTS (
    SELECT 1 FROM devices WHERE verification_id = 'knowledge_tower_meter_01'
);

INSERT INTO device_readings (device_id, voltage, ampere, watt)
SELECT d.id, 221.60, 0.00, 0.00
FROM devices d
WHERE d.verification_id = 'knowledge_tower_meter_01'
AND NOT EXISTS (
    SELECT 1 FROM device_readings r WHERE r.device_id = d.id
);

INSERT INTO device_readings (device_id, voltage, ampere, watt)
SELECT d.id, 220.40, 0.10, 22.04
FROM devices d
WHERE d.verification_id = 'knowledge_tower_meter_01'
AND (SELECT COUNT(*) FROM device_readings r WHERE r.device_id = d.id) < 2;

INSERT INTO device_readings (device_id, voltage, ampere, watt)
SELECT d.id, 222.00, 0.20, 44.40
FROM devices d
WHERE d.verification_id = 'knowledge_tower_meter_01'
AND (SELECT COUNT(*) FROM device_readings r WHERE r.device_id = d.id) < 3;
