Medical Center
==============

Folder structure:
  assets/
    css/
      style.css
    js/
      app.js
  index.html
  README.txt

Local URL example:
  http://localhost/diu_electricity_monitoring/daffodil_smart_city/medical_center/

API connection:
  This page loads data from:
  /diu_electricity_monitoring/electricity_api/devices/list.php

Device filtering:
  app.js filters devices where building_name/building/location_name/location matches:
  Medical Center

Admin link:
  The Add Device button points to:
  /diu_electricity_monitoring/electricity_frontend/dashboard.html
