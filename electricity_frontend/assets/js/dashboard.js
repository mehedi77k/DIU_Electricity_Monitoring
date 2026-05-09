document.addEventListener("DOMContentLoaded", () => {
    const adminName = document.getElementById("adminName");
    const logoutBtn = document.getElementById("logoutBtn");

    const burgerBtn = document.getElementById("burgerBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const openModalBtn = document.getElementById("openModalBtn");
    const modal = document.getElementById("locationModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelModalBtn = document.getElementById("cancelModalBtn");

    const locationForm = document.getElementById("locationForm");
    const saveLocationBtn = document.getElementById("saveLocationBtn");
    const adminPasswordInput = document.getElementById("adminPassword");

    const locationGrid = document.getElementById("locationGrid");
    const dashboardAlert = document.getElementById("dashboardAlert");
    const formAlert = document.getElementById("formAlert");

    init();

    async function init() {
        await requireLogin();
        bindEvents();
        await loadLocations();
    }

    async function requireLogin() {
        try {
            const response = await apiFetch("/auth/me.php");
            const admin = response.data.admin;

            adminName.textContent = admin.name || "Admin";
        } catch (error) {
            window.location.href = "index.html";
        }
    }

    function bindEvents() {
        if (burgerBtn && sidebar && sidebarOverlay) {
            burgerBtn.addEventListener("click", toggleSidebar);
            sidebarOverlay.addEventListener("click", closeSidebar);
        }

        if (openModalBtn) {
            openModalBtn.addEventListener("click", () => {
                closeSidebar();
                openModal();
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", closeModal);
        }

        if (cancelModalBtn) {
            cancelModalBtn.addEventListener("click", closeModal);
        }

        if (modal) {
            modal.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeModal();
                closeSidebar();
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener("click", logout);
        }

        if (locationForm) {
            locationForm.addEventListener("submit", submitLocationForm);
        }
    }

    function openSidebar() {
        if (!sidebar || !sidebarOverlay || !burgerBtn) return;

        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
        document.body.classList.add("sidebar-open");

        burgerBtn.textContent = "×";
        burgerBtn.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
        if (!sidebar || !sidebarOverlay || !burgerBtn) return;

        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
        document.body.classList.remove("sidebar-open");

        burgerBtn.textContent = "☰";
        burgerBtn.setAttribute("aria-expanded", "false");
    }

    function toggleSidebar() {
        if (!sidebar) return;

        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openModal() {
        hideAlert(formAlert);

        if (!modal) return;

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");

        setTimeout(() => {
            const locationNameInput = document.getElementById("locationName");
            if (locationNameInput) {
                locationNameInput.focus();
            }
        }, 50);
    }

    function closeModal() {
        if (!modal) return;

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        hideAlert(formAlert);

        if (adminPasswordInput) {
            adminPasswordInput.value = "";
        }
    }

    async function logout() {
        try {
            await apiFetch("/auth/logout.php", {
                method: "POST"
            });
        } finally {
            window.location.href = "index.html";
        }
    }

    async function loadLocations() {
        try {
            const response = await apiFetch("/locations/list.php");
            const locations = response.data.locations || [];

            renderLocations(locations);
            hideAlert(dashboardAlert);
        } catch (error) {
            renderLocations([]);
            showAlert(dashboardAlert, error.message || "Failed to load location homepages.");
        }
    }

    function renderLocations(locations) {
        if (!locationGrid) return;

        locationGrid.innerHTML = "";

        if (!locations.length) {
            locationGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚡</div>
                    <h3>No location added yet</h3>
                    <p>Click “Add Location” to create your first location homepage card.</p>
                </div>
            `;
            return;
        }

        locations.forEach((location) => {
            const card = document.createElement("article");
            card.className = "location-card";

            card.innerHTML = `
                <h3>${escapeHtml(location.location_name)}</h3>

                <div class="building-card-actions">
                    <a class="open-homepage-btn" href="${escapeHtml(location.page_link)}">
                        Open Location
                    </a>

                    <button 
                        type="button" 
                        class="remove-building-btn"
                        data-location-id="${location.id}">
                        Remove
                    </button>
                </div>
            `;

            card.addEventListener("click", (event) => {
                const clickedAction = event.target.closest("a, button");

                if (clickedAction) return;

                window.location.href = location.page_link;
            });

            locationGrid.appendChild(card);
        });

        locationGrid.querySelectorAll(".remove-building-btn").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();

                const locationId = Number(button.dataset.locationId);
                removeLocation(locationId);
            });
        });
    }

    async function submitLocationForm(event) {
        event.preventDefault();

        hideAlert(formAlert);
        hideAlert(dashboardAlert);

        const locationName = document.getElementById("locationName").value.trim();
        const verificationTable = document.getElementById("verificationTable").value.trim().toLowerCase();
        const pageLink = document.getElementById("pageLink").value.trim();
        const adminPassword = adminPasswordInput ? adminPasswordInput.value.trim() : "";

        if (!locationName || !verificationTable || !pageLink || !adminPassword) {
            showAlert(formAlert, "All fields are required. Please enter your password.");
            return;
        }

        if (!/^[a-z0-9_]{2,100}$/.test(verificationTable)) {
            showAlert(formAlert, "Verification ID must use lowercase letters, numbers and underscore only.");
            return;
        }

        saveLocationBtn.disabled = true;
        saveLocationBtn.textContent = "Saving...";

        try {
            await apiFetch("/locations/create.php", {
                method: "POST",
                body: JSON.stringify({
                    location_name: locationName,
                    verification_table: verificationTable,
                    page_link: pageLink,
                    admin_password: adminPassword
                })
            });

            locationForm.reset();
            closeModal();

            showAlert(dashboardAlert, "Location homepage added successfully.", "success");

            await loadLocations();
        } catch (error) {
            showAlert(formAlert, error.message || "Failed to create location homepage.");
        } finally {
            saveLocationBtn.disabled = false;
            saveLocationBtn.textContent = "Save Location";
        }
    }

    async function removeLocation(locationId) {
        const confirmed = confirm("Remove this location homepage card?");

        if (!confirmed) return;

        hideAlert(dashboardAlert);

        try {
            await apiFetch("/locations/delete.php", {
                method: "POST",
                body: JSON.stringify({
                    location_id: locationId
                })
            });

            showAlert(dashboardAlert, "Location homepage removed successfully.", "success");

            await loadLocations();
        } catch (error) {
            showAlert(dashboardAlert, error.message || "Failed to remove location homepage.");
        }
    }
});