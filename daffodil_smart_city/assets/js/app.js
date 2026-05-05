const API_BASE_URL = 'http://localhost/electricity_api';
const CAMPUS_NAME = 'Daffodil Smart City';

document.addEventListener('DOMContentLoaded', () => {
    const burgerBtn = document.getElementById('burgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const deviceGrid = document.getElementById('deviceGrid');
    const viewDevicesBtn = document.getElementById('viewDevicesBtn');
    const deviceSection = document.getElementById('deviceSection');
    const pageAlert = document.getElementById('pageAlert');

    let campusDevices = [];
    let alertTimeoutId = null;
    let hasUserRequested = false;

    bindEvents();
    loadCampusDevices();

    function bindEvents() {
        if (burgerBtn && sidebar && sidebarOverlay) {
            burgerBtn.addEventListener('click', toggleSidebar);
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeSidebar();
            }
        });

        if (viewDevicesBtn && deviceSection) {
            viewDevicesBtn.addEventListener('click', () => {
                hasUserRequested = true;
                deviceSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        }
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
        document.body.classList.add('sidebar-open');

        burgerBtn.textContent = '×';
        burgerBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
        document.body.classList.remove('sidebar-open');

        burgerBtn.textContent = '☰';
        burgerBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    async function loadCampusDevices() {
        hideAlert();

        try {
            const response = await fetch(`${API_BASE_URL}/devices/list.php`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();

            if (!response.ok || !result.status) {
                throw new Error(result.message || 'Failed to load devices.');
            }

            const allDevices = result.data.devices || [];

            campusDevices = allDevices.filter(device => {
                return String(device.campus_name || '').toLowerCase() === CAMPUS_NAME.toLowerCase();
            });

            renderDevices(campusDevices);
        } catch (error) {
            console.error(error);

            renderDevices([]);

            if (hasUserRequested) {
                showAlert(
                    'Could not load buildings. Make sure electricity_api is running and you are logged in from Admin Dashboard first.',
                    'danger'
                );
            }
        }
    }

    function renderDevices(devices) {
        deviceGrid.innerHTML = '';

        if (!devices.length) {
            deviceGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚡</div>
                    <h3>No building added yet</h3>
                    <p>Click “Add Buildings” after adding Daffodil Smart City buildings from Admin Dashboard.</p>
                </div>
            `;
            return;
        }

        devices.forEach(device => {
            const card = document.createElement('article');
            card.className = 'device-card';

            card.innerHTML = `
                <div class="device-card-head">
                    <div>
                        <h3>${escapeHtml(device.device_name)}</h3>
                        <p>${escapeHtml(device.device_type)} · ${escapeHtml(device.building_name || 'No building')}</p>
                    </div>

                    <span class="status-badge status-${escapeHtml(device.status)}">
                        ${escapeHtml(device.status)}
                    </span>
                </div>

                <div class="reading-grid">
                    <div class="reading-box">
                        <span>Average Voltage</span>
                        <strong>${formatNumber(device.average_voltage)} V</strong>
                    </div>

                    <div class="reading-box">
                        <span>Average Watt</span>
                        <strong>${formatNumber(device.average_watt)} W</strong>
                    </div>

                    <div class="reading-box">
                        <span>Average Ampere</span>
                        <strong>${formatNumber(device.average_ampere)} A</strong>
                    </div>
                </div>

                <div class="card-meta">
                    <div><strong>Campus:</strong> ${escapeHtml(device.campus_name || 'N/A')}</div>
                    <div><strong>Building:</strong> ${escapeHtml(device.building_name || 'N/A')}</div>
                    <div><strong>Verification ID:</strong> ${escapeHtml(device.verification_id)}</div>
                    <div><strong>Total Readings:</strong> ${escapeHtml(device.total_readings)}</div>
                    <div><strong>Last Recorded:</strong> ${escapeHtml(device.last_recorded_at || 'No reading yet')}</div>
                </div>
            `;

            deviceGrid.appendChild(card);
        });
    }

    function showAlert(message, type = 'danger') {
        if (!pageAlert) return;

        if (alertTimeoutId) {
            clearTimeout(alertTimeoutId);
        }

        pageAlert.textContent = message;
        pageAlert.className = `alert ${type}`;

        alertTimeoutId = setTimeout(() => {
            hideAlert();
        }, 4000);
    }

    function hideAlert() {
        if (!pageAlert) return;

        pageAlert.textContent = '';
        pageAlert.className = 'alert hidden';
    }

    function formatNumber(value) {
        const number = Number(value || 0);
        return number.toFixed(2);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});