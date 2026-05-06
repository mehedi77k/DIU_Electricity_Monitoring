const CURRENT_PATH = window.location.pathname;
const FRONTEND_MARKER = "/electricity_frontend/";
const frontendIndex = CURRENT_PATH.indexOf(FRONTEND_MARKER);

const APP_BASE = frontendIndex >= 0
    ? CURRENT_PATH.substring(0, frontendIndex)
    : "";

const API_BASE = `${APP_BASE}/electricity_api`;

async function apiFetch(endpoint, options = {}) {
    const fetchOptions = {
        credentials: "include",
        ...options,
        headers: {
            "Accept": "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

    let payload = null;

    try {
        payload = await response.json();
    } catch (error) {
        payload = {
            success: false,
            message: "Invalid JSON response from API.",
            data: {}
        };
    }

    if (!response.ok || !payload.success) {
        const message = payload && payload.message
            ? payload.message
            : "API request failed.";

        throw new Error(message);
    }

    return payload;
}

function showAlert(element, message, type = "danger") {
    if (!element) return;

    element.textContent = message;
    element.className = `alert ${type}`;
}

function hideAlert(element) {
    if (!element) return;

    element.textContent = "";
    element.className = "alert hidden";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(value, decimals = 2) {
    const number = Number(value || 0);
    return number.toFixed(decimals);
}