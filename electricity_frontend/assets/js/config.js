const API_BASE = `${window.location.origin}/diu_electricity_monitoring/electricity_api`;
const API_BASE_URL = API_BASE;

async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: options.method || "GET",
        credentials: "include",
        headers: {
            "Accept": "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        },
        body: options.body || undefined
    });

    let payload = null;

    try {
        payload = await response.json();
    } catch (error) {
        throw new Error("Invalid JSON response from API.");
    }

    if (!response.ok || !payload.status) {
        throw new Error(payload.message || "API request failed.");
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