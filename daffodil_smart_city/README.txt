Daffodil Smart City Homepage
============================

Place this folder here:
C:\xampp\htdocs\daffodil_smart_city\

Run link:
http://localhost/daffodil_smart_city/

This frontend communicates with:
http://localhost/electricity_api/devices/list.php

Required existing folders:
C:\xampp\htdocs\electricity_api\
C:\xampp\htdocs\electricity_frontend\

Required database:
electricity_demoweb

Important:
- If /devices/list.php requires admin session, login first from:
  http://localhost/electricity_frontend/
- Then refresh:
  http://localhost/daffodil_smart_city/

Device source:
- Only active devices where campus_name = "Daffodil Smart City" will show.
- Devices added from Admin Dashboard under Daffodil Smart City will appear here.
