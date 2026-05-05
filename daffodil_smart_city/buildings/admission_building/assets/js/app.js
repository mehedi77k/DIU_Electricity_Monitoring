const BUILDING_CONFIG = {
  name: "Admission Building",
  campus: "Daffodil Smart City"
};

const $ = (selector) => document.querySelector(selector);

function getProjectBasePath() {
  const marker = "/daffodil_smart_city/";
  const path = window.location.pathname;
  const markerIndex = path.indexOf(marker);

  if (markerIndex === -1) {
    return window.location.origin;
  }

  return window.location.origin + path.slice(0, markerIndex);
}

const PROJECT_BASE = getProjectBasePath();
const API_BASE = `${PROJECT_BASE}/electricity_api`;
const FRONTEND_BASE = `${PROJECT_BASE}/electricity_frontend`;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickDeviceArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.devices)) return payload.devices;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.devices)) return payload.data.devices;
  return [];
}

function deviceMatchesBuilding(device) {
  const target = normalize(BUILDING_CONFIG.name);
  const possibleFields = [
    device.building_name,
    device.building,
    device.location_name,
    device.location,
    device.homepage_title
  ];

  return possibleFields.some((field) => normalize(field) === target);
}

function formatMetric(value, unit) {
  const num = toNumber(value);
  if (!num) return `-- ${unit}`;
  return `${num.toFixed(num >= 100 ? 0 : 1)} ${unit}`;
}

function renderEmpty() {
  $("#cards").innerHTML = `
    <div class="empty-card">
      <div>
        <div class="empty-icon">⚡</div>
        <h3>No device added yet</h3>
        <p>Add a device for ${BUILDING_CONFIG.name} from the admin panel.</p>
      </div>
    </div>
  `;
}

function renderError(message) {
  $("#cards").innerHTML = `
    <div class="error-card">
      <div>
        <div class="empty-icon">!</div>
        <h3>Could not load device data</h3>
        <p>${message}</p>
      </div>
    </div>
  `;
}

function renderDevices(devices) {
  if (!devices.length) {
    renderEmpty();
    return;
  }

  $("#cards").innerHTML = devices.map((device) => {
    const name = device.device_name || device.name || device.verification_id || "Electricity Device";
    const verification = device.verification_id || device.device_id || "N/A";
    const voltage = device.avg_voltage ?? device.voltage ?? device.latest_voltage;
    const ampere = device.avg_ampere ?? device.ampere ?? device.latest_ampere;
    const watt = device.avg_watt ?? device.watt ?? device.latest_watt;

    return `
      <article class="device-card">
        <div>
          <h3 class="device-title">${name}</h3>
          <p class="device-meta">Verification ID: ${verification}</p>
          <div class="status-row">
            <span class="status-pill">Active</span>
            <a class="back-link" href="${FRONTEND_BASE}/dashboard.html">Manage from admin</a>
          </div>
        </div>
        <div class="metric"><strong>${formatMetric(voltage, "V")}</strong><span>Voltage</span></div>
        <div class="metric"><strong>${formatMetric(ampere, "A")}</strong><span>Ampere</span></div>
        <div class="metric"><strong>${formatMetric(watt, "W")}</strong><span>Watt</span></div>
      </article>
    `;
  }).join("");
}

async function loadDevices() {
  try {
    $("#buildingName").textContent = BUILDING_CONFIG.name;
    $("#buildingLead").textContent = `Monitor devices and electricity readings for ${BUILDING_CONFIG.name}.`;
    $("#adminLink").href = `${FRONTEND_BASE}/dashboard.html`;
    $("#campusLink").href = `../index.html`;

    const response = await fetch(`${API_BASE}/devices/list.php`, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const payload = await response.json();
    const devices = pickDeviceArray(payload).filter(deviceMatchesBuilding);
    renderDevices(devices);
  } catch (error) {
    renderError(error.message || "Please check API_BASE and XAMPP server.");
  }
}

document.addEventListener("DOMContentLoaded", loadDevices);
