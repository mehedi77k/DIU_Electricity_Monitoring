# DIU Electricity Monitoring

A PHP, MySQL, HTML, CSS, and JavaScript based electricity monitoring system for managing campus electricity devices, viewing device status, tracking demo power readings, and maintaining dynamic campus/building/floor/room pages.

The project is designed for a local XAMPP environment and includes:

- Admin login and registration
- Device management dashboard
- Campus and building based device organization
- Device status tracking
- Average voltage, ampere, and watt summary
- Demo electricity readings
- Dynamic location hierarchy management
- Daffodil Smart City public homepage

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [System Requirements](#system-requirements)
- [Installation and Setup](#installation-and-setup)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Default Local URLs](#default-local-urls)
- [API Overview](#api-overview)
- [Database Overview](#database-overview)
- [How the System Works](#how-the-system-works)
- [Security Notes](#security-notes)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Project Overview

**DIU Electricity Monitoring** is a web-based monitoring and administration platform for electricity usage across campus locations. The system allows an admin to add and manage devices, connect each device with a campus and building, and view summarized electrical metrics such as voltage, ampere, and watt.

The project also includes a dedicated **Daffodil Smart City** public homepage that displays active devices belonging to the Daffodil Smart City campus.

---

## Features

### Admin Features

- Admin login
- Admin registration
- Session-based authentication
- Admin dashboard
- Add and manage location homepages
- Add, view, and remove electricity monitoring devices
- Manage dynamic building, level, and room hierarchy

### Device Management

- Add smart meter or electricity monitoring devices
- Assign devices to campus and building
- Store unique verification ID for each device
- Store device data link
- Track device status:
  - Online
  - Offline
  - Not installed
- Soft delete devices instead of permanently deleting records
- View average:
  - Voltage
  - Ampere
  - Watt
- View total readings and last recorded timestamp

### Campus and Building Management

- Load campus list from database
- Load buildings based on selected campus
- Support for multiple campuses
- Initial database seed includes Daffodil Smart City and Daffodil UAE Campus

### Dynamic Location Management

- Manage active hierarchy for:
  - Buildings
  - Levels / Floors
  - Rooms
- Auto-fill approved catalog values from MySQL catalog tables
- Activate and deactivate hierarchy pages
- Generate structured page links for building, floor, and room pages

### Public Smart City Homepage

- Public-facing Daffodil Smart City homepage
- Displays active devices from the Daffodil Smart City campus
- Communicates with the device API
- Works with devices added from the admin dashboard

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | PHP |
| Database | MySQL |
| Local Server | XAMPP / Apache |
| Data Format | JSON |
| Authentication | PHP Sessions |

---

## Project Structure

```text
DIU_Electricity_Monitoring/
│
├── daffodil_smart_city/
│   ├── assets/
│   ├── buildings/
│   ├── README.txt
│   └── index.html
│
├── electricity_api/
│   ├── auth/
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── me.php
│   │   └── register.php
│   │
│   ├── building_catalog/
│   │   └── list.php
│   │
│   ├── building_pages/
│   │   ├── create.php
│   │   ├── delete.php
│   │   └── list.php
│   │
│   ├── buildings/
│   │   └── list.php
│   │
│   ├── campuses/
│   │   └── list.php
│   │
│   ├── config/
│   │   ├── bootstrap.php
│   │   ├── db.php
│   │   └── helpers.php
│   │
│   ├── database/
│   │   └── electricity_demoweb.sql
│   │
│   ├── devices/
│   │   ├── create.php
│   │   ├── delete.php
│   │   └── list.php
│   │
│   ├── dynamic/
│   │   ├── create.php
│   │   ├── deactivate.php
│   │   ├── list.php
│   │   └── options.php
│   │
│   ├── floor_pages/
│   │   ├── create.php
│   │   ├── delete.php
│   │   └── list.php
│   │
│   ├── level_catalog/
│   │   └── list.php
│   │
│   ├── locations/
│   │   ├── create.php
│   │   ├── delete.php
│   │   └── list.php
│   │
│   ├── readings/
│   │   └── add_dummy.php
│   │
│   ├── room_catalog/
│   │   └── list.php
│   │
│   ├── room_pages/
│   │   ├── create.php
│   │   ├── delete.php
│   │   └── list.php
│   │
│   ├── system/
│   │   └── test_db.php
│   │
│   ├── index.php
│   └── setup_admin.php
│
└── electricity_frontend/
    ├── assets/
    ├── dashboard.html
    ├── dynamic-management.html
    ├── index.html
    ├── index.php
    └── setup_admin.php
```

---

## System Requirements

Before running this project, install:

- XAMPP
- PHP 7.4 or higher
- MySQL / MariaDB
- Apache server
- Modern web browser

Recommended local environment:

```text
Apache: Running
MySQL: Running
Project location: C:\xampp\htdocs\
```

---

## Installation and Setup

### 1. Clone or Download the Repository

```bash
git clone https://github.com/mehedi77k/DIU_Electricity_Monitoring.git
```

Or download the ZIP file from GitHub and extract it.

### 2. Move Project Folders to XAMPP htdocs

Copy these three folders directly into:

```text
C:\xampp\htdocs\
```

Required folder placement:

```text
C:\xampp\htdocs\electricity_api\
C:\xampp\htdocs\electricity_frontend\
C:\xampp\htdocs\daffodil_smart_city\
```

The final structure should look like:

```text
C:\xampp\htdocs\
│
├── electricity_api\
├── electricity_frontend\
└── daffodil_smart_city\
```

Do not place the folders only inside another nested project folder unless you also update the frontend API paths.

---

## Database Setup

### 1. Start XAMPP

Open XAMPP Control Panel and start:

```text
Apache
MySQL
```

### 2. Open phpMyAdmin

Visit:

```text
http://localhost/phpmyadmin
```

### 3. Import the Database

Import the SQL file:

```text
electricity_api/database/electricity_demoweb.sql
```

The SQL file creates the database:

```text
electricity_demoweb
```

Core tables include:

- `admins`
- `campuses`
- `buildings`
- `devices`
- `device_readings`

Initial seed data includes campuses, buildings, one demo smart meter, and sample readings.

### 4. Configure Database Connection

Open:

```text
electricity_api/config/db.php
```

Check and update the database credentials if required.

Typical XAMPP local settings are:

```text
Host: localhost
Username: root
Password: 
Database: electricity_demoweb
```

Use your own MySQL credentials if they are different.

---

## Running the Project

### 1. Test API Database Connection

Open:

```text
http://localhost/electricity_api/system/test_db.php
```

If the database connection is working, the API should return a JSON success response.

### 2. Create or Prepare Admin Account

Open:

```text
http://localhost/electricity_api/setup_admin.php
```

This script creates or updates a super admin account.

After creating the admin account, open the admin frontend:

```text
http://localhost/electricity_frontend/
```

### 3. Login to Admin Panel

Visit:

```text
http://localhost/electricity_frontend/
```

Use the admin credentials created during setup.

### 4. Open Admin Dashboard

After login, the dashboard allows you to manage devices and locations.

Dashboard page:

```text
http://localhost/electricity_frontend/dashboard.html
```

### 5. Open Dynamic Location Management

```text
http://localhost/electricity_frontend/dynamic-management.html
```

### 6. Open Daffodil Smart City Homepage

```text
http://localhost/daffodil_smart_city/
```

Important: if the device API requires an active admin session, login first from:

```text
http://localhost/electricity_frontend/
```

Then refresh:

```text
http://localhost/daffodil_smart_city/
```

---

## Default Local URLs

| Module | URL |
|---|---|
| API Home | `http://localhost/electricity_api/` |
| API DB Test | `http://localhost/electricity_api/system/test_db.php` |
| Admin Setup | `http://localhost/electricity_api/setup_admin.php` |
| Admin Login | `http://localhost/electricity_frontend/` |
| Admin Dashboard | `http://localhost/electricity_frontend/dashboard.html` |
| Dynamic Location Management | `http://localhost/electricity_frontend/dynamic-management.html` |
| Daffodil Smart City Homepage | `http://localhost/daffodil_smart_city/` |

---

## API Overview

The backend API returns JSON responses.

General response format:

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "data": {}
}
```

### Authentication API

| Endpoint | Purpose |
|---|---|
| `/electricity_api/auth/register.php` | Register an admin account |
| `/electricity_api/auth/login.php` | Login admin |
| `/electricity_api/auth/me.php` | Check current authenticated admin |
| `/electricity_api/auth/logout.php` | Logout admin |

### Campus and Building API

| Endpoint | Purpose |
|---|---|
| `/electricity_api/campuses/list.php` | Load all campuses |
| `/electricity_api/buildings/list.php` | Load buildings by campus |

Example:

```text
http://localhost/electricity_api/buildings/list.php?campus_id=1
```

### Device API

| Endpoint | Purpose |
|---|---|
| `/electricity_api/devices/list.php` | Load devices and summary data |
| `/electricity_api/devices/create.php` | Create a new device |
| `/electricity_api/devices/delete.php` | Soft delete a device |

Device fields include:

- Device name
- Device type
- Campus
- Building
- Verification ID
- Data link
- Status

### Location Homepage API

| Endpoint | Purpose |
|---|---|
| `/electricity_api/locations/list.php` | List active location homepages |
| `/electricity_api/locations/create.php` | Create or reactivate a location homepage |
| `/electricity_api/locations/delete.php` | Soft delete a location homepage |

### Dynamic Hierarchy API

| Endpoint | Purpose |
|---|---|
| `/electricity_api/dynamic/options.php` | Load available catalog and hierarchy options |
| `/electricity_api/dynamic/list.php` | Load active building, level, and room hierarchy |
| `/electricity_api/dynamic/create.php` | Create or activate building, level, or room page |
| `/electricity_api/dynamic/deactivate.php` | Deactivate building, level, or room page |

### Catalog API

| Endpoint | Purpose |
|---|---|
| `/electricity_api/building_catalog/list.php` | Load approved building catalog |
| `/electricity_api/level_catalog/list.php` | Load approved level catalog |
| `/electricity_api/room_catalog/list.php` | Load approved room catalog |

---

## Database Overview

### Core Tables

#### `admins`

Stores admin user accounts.

Main fields:

- `id`
- `name`
- `email`
- `password_hash`
- `role`
- `created_at`

#### `campuses`

Stores campus names.

Main fields:

- `id`
- `campus_name`
- `created_at`

#### `buildings`

Stores buildings under campuses.

Main fields:

- `id`
- `campus_id`
- `building_name`
- `created_at`

#### `devices`

Stores electricity monitoring devices.

Main fields:

- `id`
- `device_name`
- `device_type`
- `campus_id`
- `building_id`
- `verification_id`
- `data_link`
- `status`
- `is_active`
- `created_at`

#### `device_readings`

Stores device reading data.

Main fields:

- `id`
- `device_id`
- `voltage`
- `ampere`
- `watt`
- `recorded_at`

### Dynamic Module Tables

The dynamic location module uses additional tables such as:

- `location_pages`
- `building_catalog`
- `level_catalog`
- `room_catalog`
- `building_pages`
- `floor_pages`
- `room_pages`

It may also use database views for active pages, such as:

- `vw_active_building_pages`
- `vw_active_floor_pages`
- `vw_active_room_pages`

If the dynamic management page does not work after importing the database, verify that these tables and views exist in your local MySQL database.

---

## How the System Works

1. Admin logs in through the frontend.
2. PHP API validates credentials and creates a session.
3. Dashboard loads campus and building data from MySQL.
4. Admin adds electricity monitoring devices.
5. Each device is stored with campus, building, verification ID, status, and data link.
6. Demo readings are inserted for newly created devices.
7. Device list API calculates summary values.
8. The dashboard displays total devices, online/offline status, and average electrical values.
9. The Daffodil Smart City homepage loads active devices where the campus is Daffodil Smart City.
10. Dynamic management can activate building, level, and room pages from approved catalog tables.

---

## Device Reading Logic

The current system stores demo readings in the `device_readings` table.

Each reading contains:

- Voltage
- Ampere
- Watt
- Recorded timestamp

When a new device is created, the API inserts sample readings for dashboard demonstration.

For production use, replace the demo reading logic with real sensor data, IoT device data, or an external API integration.

---

## Security Notes

Before using this project outside a local development environment:

- Remove or protect `setup_admin.php` after creating the admin account.
- Use strong admin passwords.
- Change default database credentials.
- Do not expose raw database errors in production.
- Enable HTTPS.
- Set secure session cookie settings for production.
- Add CSRF protection for state-changing requests.
- Restrict API access to authenticated users where required.
- Validate and sanitize all user inputs.
- Keep database backups.

---

## Known Limitations

- The project is configured mainly for localhost/XAMPP.
- Some URLs are hardcoded for local development.
- Device readings are demo values, not live IoT data.
- Dynamic hierarchy features require the related catalog/page tables and views to exist in the database.
- Production deployment requires additional security hardening.

---

## Future Improvements

Possible improvements include:

- Real-time sensor data integration
- MQTT or IoT API support
- Role-based access control
- Graphs for electricity usage history
- Export reports as PDF or CSV
- Device alert notifications
- Improved responsive UI
- Production-ready environment configuration
- REST API documentation
- Docker support
- Automated database migrations

---

## Author

**Mehedi Hasan**

GitHub: [mehedi77k](https://github.com/mehedi77k)

---

## Repository

```text
https://github.com/mehedi77k/DIU_Electricity_Monitoring
```

