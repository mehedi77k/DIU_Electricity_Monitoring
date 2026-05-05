document.addEventListener('DOMContentLoaded', () => {
    const adminName = document.getElementById('adminName');
    const logoutBtn = document.getElementById('logoutBtn');

    const burgerBtn = document.getElementById('burgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    const openModalBtn = document.getElementById('openModalBtn');

    const modal = document.getElementById('deviceModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const deviceForm = document.getElementById('deviceForm');

    const campusSelect = document.getElementById('campusSelect');
    const buildingSelect = document.getElementById('buildingSelect');

    const dashboardAlert = document.getElementById('dashboardAlert');
    const formAlert = document.getElementById('formAlert');
    const saveDeviceBtn = document.getElementById('saveDeviceBtn');

    const deviceGrid = document.getElementById('deviceGrid');

    init();

    async function init() {
        await requireLogin();
        bindEvents();
        await loadCampuses();
        await loadDevices();
    }

    async function requireLogin() {
        try {
            const response = await apiFetch('/auth/me.php');
            const admin = response.data.admin;
            adminName.textContent = admin.name || 'Admin';
        } catch (error) {
            window.location.href = 'index.html';
        }
    }

    function bindEvents() {
        if (burgerBtn && sidebar && sidebarOverlay) {
            burgerBtn.addEventListener('click', toggleSidebar);
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                closeSidebar();
                openModal();
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        if (cancelModalBtn) {
            cancelModalBtn.addEventListener('click', closeModal);
        }

        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeModal();
                closeSidebar();
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        if (campusSelect) {
            campusSelect.addEventListener('change', () => loadBuildings(campusSelect.value));
        }

        if (deviceForm) {
            deviceForm.addEventListener('submit', submitDeviceForm);
        }
    }

    function openSidebar() {
        if (!sidebar || !sidebarOverlay || !burgerBtn) return;

        sidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
        document.body.classList.add('sidebar-open');

        burgerBtn.textContent = '×';
        burgerBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        if (!sidebar || !sidebarOverlay || !burgerBtn) return;

        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
        document.body.classList.remove('sidebar-open');

        burgerBtn.textContent = '☰';
        burgerBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleSidebar() {
        if (!sidebar) return;

        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openModal() {
        hideAlert(formAlert);

        if (!modal) return;

        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        if (!modal) return;

        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        hideAlert(formAlert);
    }

    async function logout() {
        try {
            await apiFetch('/auth/logout.php', {
                method: 'POST'
            });
        } finally {
            window.location.href = 'index.html';
        }
    }

    async function loadCampuses() {
        try {
            const response = await apiFetch('/campuses/list.php');
            const campuses = response.data.campuses || [];

            campusSelect.innerHTML = '<option value="">Select Campus</option>';

            campuses.forEach(campus => {
                const option = document.createElement('option');
                option.value = campus.id;
                option.textContent = campus.campus_name;
                campusSelect.appendChild(option);
            });
        } catch (error) {
            campusSelect.innerHTML = '<option value="">Failed to load campuses</option>';
            showAlert(dashboardAlert, error.message || 'Failed to load campuses.');
        }
    }

    async function loadBuildings(campusId) {
        buildingSelect.innerHTML = '<option value="">Loading...</option>';

        if (!campusId) {
            buildingSelect.innerHTML = '<option value="">Select campus first</option>';
            return;
        }

        try {
            const response = await apiFetch(`/buildings/list.php?campus_id=${encodeURIComponent(campusId)}`);
            const buildings = response.data.buildings || [];

            buildingSelect.innerHTML = '<option value="">Select Building</option>';

            if (!buildings.length) {
                buildingSelect.innerHTML = '<option value="">No building found</option>';
                return;
            }

            buildings.forEach(building => {
                const option = document.createElement('option');
                option.value = building.id;
                option.textContent = building.building_name;
                buildingSelect.appendChild(option);
            });
        } catch (error) {
            buildingSelect.innerHTML = '<option value="">Failed to load buildings</option>';
            showAlert(formAlert, error.message || 'Failed to load buildings.');
        }
    }

    async function loadDevices() {
        try {
            const response = await apiFetch('/devices/list.php');
            const devices = response.data.devices || [];

            renderDevices(devices);
        } catch (error) {
            showAlert(dashboardAlert, error.message || 'Failed to load devices.');
            renderDevices([]);
        }
    }

    function renderDevices(devices) {
        if (!deviceGrid) return;

        deviceGrid.innerHTML = '';

        if (!devices.length) {
            deviceGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚡</div>
                    <h3>No device added yet</h3>
                    <p>Click “Add Device” to create your first device card.</p>
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
                    <div><strong>Verification ID:</strong> ${escapeHtml(device.verification_id)}</div>
                    <div><strong>Total Readings:</strong> ${escapeHtml(device.total_readings)}</div>
                    <div><strong>Last Recorded:</strong> ${escapeHtml(device.last_recorded_at || 'No reading yet')}</div>
                </div>

                <div class="card-actions">
                    <button 
                        type="button" 
                        class="remove-device-btn" 
                        data-device-id="${device.id}">
                        Remove Device
                    </button>
                </div>
            `;

            deviceGrid.appendChild(card);
        });

        const removeButtons = deviceGrid.querySelectorAll('.remove-device-btn');

        removeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const deviceId = button.dataset.deviceId;
                removeDevice(deviceId);
            });
        });
    }

    async function submitDeviceForm(event) {
        event.preventDefault();
        hideAlert(formAlert);
        hideAlert(dashboardAlert);

        const payload = {
            device_name: document.getElementById('deviceName').value.trim(),
            device_type: document.getElementById('deviceType').value,
            campus_id: Number(campusSelect.value),
            building_id: Number(buildingSelect.value),
            verification_id: document.getElementById('verificationId').value.trim().toLowerCase(),
            data_link: document.getElementById('dataLink').value.trim(),
            status: 'online'
        };

        if (
            !payload.device_name ||
            !payload.device_type ||
            !payload.campus_id ||
            !payload.building_id ||
            !payload.verification_id ||
            !payload.data_link
        ) {
            showAlert(formAlert, 'All fields are required.');
            return;
        }

        if (!/^[a-z0-9_]{3,100}$/.test(payload.verification_id)) {
            showAlert(formAlert, 'Verification ID must use lowercase letters, numbers, and underscore only.');
            return;
        }

        saveDeviceBtn.disabled = true;
        saveDeviceBtn.textContent = 'Saving...';

        try {
            await apiFetch('/devices/create.php', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            deviceForm.reset();
            buildingSelect.innerHTML = '<option value="">Select campus first</option>';

            closeModal();

            showAlert(
                dashboardAlert,
                'Device added successfully. Device card created automatically.',
                'success'
            );

            await loadDevices();
        } catch (error) {
            showAlert(formAlert, error.message || 'Failed to add device.');
        } finally {
            saveDeviceBtn.disabled = false;
            saveDeviceBtn.textContent = 'Save Device';
        }
    }

    async function removeDevice(deviceId) {
        const confirmed = confirm('Are you sure you want to remove this device?');

        if (!confirmed) {
            return;
        }

        hideAlert(dashboardAlert);

        try {
            await apiFetch('/devices/delete.php', {
                method: 'POST',
                body: JSON.stringify({
                    device_id: Number(deviceId)
                })
            });

            showAlert(
                dashboardAlert,
                'Device removed successfully.',
                'success'
            );

            await loadDevices();
        } catch (error) {
            showAlert(dashboardAlert, error.message || 'Failed to remove device.');
        }
    }
});