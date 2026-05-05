const CAMPUS_TABLE = "daffodil_smart_city";

const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;

document.addEventListener("DOMContentLoaded", () => {
    const burgerBtn = document.getElementById("burgerBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const pageAlert = document.getElementById("pageAlert");

    const addBuildingBtn = document.getElementById("addBuildingBtn");
    const buildingModal = document.getElementById("buildingModal");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const modalCancelBtn = document.getElementById("modalCancelBtn");

    const buildingForm = document.getElementById("buildingForm");
    const buildingGrid = document.getElementById("buildingGrid");

    const buildingNameInput = document.getElementById("buildingName");
    const verificationIdInput = document.getElementById("verificationId");
    const pageLinkInput = document.getElementById("pageLink");
    const saveBuildingBtn = document.getElementById("saveBuildingBtn");

    const buildingNameSuggestions = document.getElementById("buildingNameSuggestions");
    const verificationSuggestions = document.getElementById("verificationSuggestions");
    const pageLinkSuggestions = document.getElementById("pageLinkSuggestions");

    let alertTimeoutId = null;

    const buildingOptions = [
        { name: "Knowledge Tower", slug: "knowledge_tower" },
        { name: "Inspiration Building", slug: "inspiration_building" },
        { name: "Admission Building", slug: "admission_building" },
        { name: "Dean Building", slug: "dean_building" },
        { name: "Innovation Lab", slug: "innovation_lab" },
        { name: "Medical Center", slug: "medical_center" },
        { name: "Yunus Khan Scholar Garden-1 (YKSG-1)", slug: "yksg_1" },
        { name: "Yunus Khan Scholar Garden-2 (YKSG-2)", slug: "yksg_2" },
        { name: "Yunus Khan Scholar Garden-3 (YKSG-3)", slug: "yksg_3" },
        { name: "Rowshan Ara Scholar Garden-1 (RASG-1)", slug: "rasg_1" },
        { name: "Rowshan Ara Scholar Garden-2 (RASG-2)", slug: "rasg_2" },
        { name: "Sadhinota Sommelon Kendro (Main Auditorium)", slug: "sadhinota_sommelon_kendro" },
        { name: "Daffodil Islamic Center (Mosque Complex)", slug: "daffodil_islamic_center" },
        { name: "DSC Food Court", slug: "dsc_food_court" }
    ];

    bindEvents();
    setupCustomSuggestions();
    loadBuildings();

    function bindEvents() {
        if (burgerBtn && sidebar && sidebarOverlay) {
            burgerBtn.addEventListener("click", toggleSidebar);
            sidebarOverlay.addEventListener("click", closeSidebar);
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSidebar();
                closeModal();
                hideAllSuggestions();
            }
        });

        document.addEventListener("click", (event) => {
            if (!event.target.closest(".suggest-wrap")) {
                hideAllSuggestions();
            }
        });

        if (addBuildingBtn) {
            addBuildingBtn.addEventListener("click", openModal);
        }

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener("click", closeModal);
        }

        if (modalCancelBtn) {
            modalCancelBtn.addEventListener("click", closeModal);
        }

        if (buildingModal) {
            buildingModal.addEventListener("click", (event) => {
                if (event.target === buildingModal) {
                    closeModal();
                }
            });
        }

        if (buildingForm) {
            buildingForm.addEventListener("submit", handleCreateBuilding);
        }
    }

    function setupCustomSuggestions() {
        setupSuggestionField({
            input: buildingNameInput,
            box: buildingNameSuggestions,
            getSuggestions: getBuildingNameSuggestions,
            onSelect: (value) => {
                buildingNameInput.value = value;
            }
        });

        setupSuggestionField({
            input: verificationIdInput,
            box: verificationSuggestions,
            getSuggestions: getVerificationSuggestions,
            onSelect: (value) => {
                verificationIdInput.value = value;
            }
        });

        setupSuggestionField({
            input: pageLinkInput,
            box: pageLinkSuggestions,
            getSuggestions: getPageLinkSuggestions,
            onSelect: (value) => {
                pageLinkInput.value = value;
            }
        });
    }

    function setupSuggestionField({ input, box, getSuggestions, onSelect }) {
        if (!input || !box) return;

        input.addEventListener("focus", () => {
            const suggestions = getSuggestions(input.value);
            renderSuggestionBox(box, suggestions, onSelect);
        });

        input.addEventListener("input", () => {
            const suggestions = getSuggestions(input.value);
            renderSuggestionBox(box, suggestions, onSelect);
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                hideSuggestionBox(box);
            }
        });
    }

    function getBuildingNameSuggestions(query = "") {
        const search = query.trim().toLowerCase();

        if (!search) {
            return buildingOptions.map((item) => item.name);
        }

        return buildingOptions
            .filter((item) => item.name.toLowerCase().includes(search))
            .map((item) => item.name);
    }

    function getVerificationSuggestions(query = "") {
        const selectedBuilding = findBuildingByName(buildingNameInput.value);
        const search = query.trim().toLowerCase();

        if (selectedBuilding) {
            if (!search || selectedBuilding.slug.includes(search)) {
                return [selectedBuilding.slug];
            }
            return [];
        }

        if (!search) {
            return buildingOptions.map((item) => item.slug);
        }

        return buildingOptions
            .filter((item) => {
                return (
                    item.name.toLowerCase().includes(search) ||
                    item.slug.toLowerCase().includes(search)
                );
            })
            .map((item) => item.slug);
    }

    function getPageLinkSuggestions(query = "") {
        const selectedBuilding = findBuildingByName(buildingNameInput.value);
        const search = query.trim().toLowerCase();

        if (selectedBuilding) {
            const link = makeBuildingHomepageLink(selectedBuilding.slug);

            if (!search || link.toLowerCase().includes(search)) {
                return [link];
            }
            return [];
        }

        if (!search) {
            return buildingOptions.map((item) => makeBuildingHomepageLink(item.slug));
        }

        return buildingOptions
            .filter((item) => {
                return (
                    item.name.toLowerCase().includes(search) ||
                    item.slug.toLowerCase().includes(search)
                );
            })
            .map((item) => makeBuildingHomepageLink(item.slug));
    }

    function renderSuggestionBox(box, suggestions, onSelect) {
        hideAllSuggestions();
        box.innerHTML = "";

        if (!suggestions.length) {
            hideSuggestionBox(box);
            return;
        }

        const uniqueSuggestions = [...new Set(suggestions)].slice(0, 8);

        uniqueSuggestions.forEach((suggestion) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "black-suggestion-item";
            button.textContent = suggestion;

            button.addEventListener("mousedown", (event) => {
                event.preventDefault();
            });

            button.addEventListener("click", () => {
                onSelect(suggestion);
                hideSuggestionBox(box);
            });

            box.appendChild(button);
        });

        box.classList.remove("hidden");
    }

    function hideSuggestionBox(box) {
        if (!box) return;
        box.classList.add("hidden");
        box.innerHTML = "";
    }

    function hideAllSuggestions() {
        hideSuggestionBox(buildingNameSuggestions);
        hideSuggestionBox(verificationSuggestions);
        hideSuggestionBox(pageLinkSuggestions);
    }

    function findBuildingByName(name) {
        const cleanName = String(name || "").trim().toLowerCase();

        if (!cleanName) return null;

        return buildingOptions.find((item) => item.name.toLowerCase() === cleanName) || null;
    }

    function makeBuildingHomepageLink(slug) {
        return `${window.location.origin}${PROJECT_ROOT}/daffodil_smart_city/buildings/${slug}/`;
    }

    function openSidebar() {
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
        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openModal() {
        hideAlert();
        hideAllSuggestions();

        if (!buildingModal) return;

        if (buildingForm) {
            buildingForm.reset();
        }

        if (verificationIdInput) {
            verificationIdInput.value = "";
        }

        if (pageLinkInput) {
            pageLinkInput.value = "";
        }

        buildingModal.classList.remove("hidden");
        document.body.classList.add("modal-open");

        setTimeout(() => {
            buildingNameInput?.focus();
        }, 50);
    }

    function closeModal() {
        if (!buildingModal) return;

        hideAllSuggestions();
        buildingModal.classList.add("hidden");
        document.body.classList.remove("modal-open");

        if (buildingForm) {
            buildingForm.reset();
        }

        if (saveBuildingBtn) {
            saveBuildingBtn.disabled = false;
            saveBuildingBtn.textContent = "Save Building";
        }
    }

    async function loadBuildings() {
        hideAlert();

        if (!buildingGrid) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/building_pages/list.php?campus_table=${encodeURIComponent(CAMPUS_TABLE)}`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const result = await response.json();

            if (!response.ok || !result.status) {
                throw new Error(result.message || "Failed to load buildings.");
            }

            const buildings = result.data.buildings || [];
            renderBuildings(buildings);
        } catch (error) {
            console.error(error);
            renderBuildings([]);
            showAlert(
                "Could not load buildings. Make sure electricity_api/building_pages/list.php exists.",
                "danger"
            );
        }
    }

    function renderBuildings(buildings) {
        buildingGrid.innerHTML = "";

        if (!buildings.length) {
            buildingGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚡</div>
                    <h3>No building added yet</h3>
                    <p>Click “Add Buildings” and connect a building homepage.</p>
                </div>
            `;
            return;
        }

        buildings.forEach((building) => {
            const pageLink = String(building.page_link || "").trim();

            const card = document.createElement("article");
            card.className = "device-card building-card";

            card.innerHTML = `
                <div class="device-card-head">
                    <div>
                        <h3>${escapeHtml(building.building_name)}</h3>
                    </div>

                    <span class="status-badge status-online">Active</span>
                </div>

                <div class="building-card-actions">
                    <a
                        class="open-homepage-btn"
                        href="${escapeAttribute(pageLink)}"
                        ${pageLink ? "" : 'style="pointer-events:none;opacity:.55;"'}
                    >
                        Open Homepage
                    </a>

                    <button
                        class="remove-building-btn"
                        type="button"
                        data-id="${building.id}"
                    >
                        Remove
                    </button>
                </div>
            `;

            const openBtn = card.querySelector(".open-homepage-btn");
            const removeBtn = card.querySelector(".remove-building-btn");

            if (!pageLink) {
                openBtn.addEventListener("click", (event) => {
                    event.preventDefault();
                    showAlert("Homepage link not found for this building.", "danger");
                });
            }

            removeBtn.addEventListener("click", () => {
                removeBuilding(building.id, building.building_name);
            });

            buildingGrid.appendChild(card);
        });
    }

    async function handleCreateBuilding(event) {
        event.preventDefault();
        hideAlert();
        hideAllSuggestions();

        const buildingName = buildingNameInput.value.trim();
        const verificationId = verificationIdInput.value.trim();
        const pageLink = pageLinkInput.value.trim();

        if (!buildingName) {
            showAlert("Please enter Building Name.", "danger");
            buildingNameInput.focus();
            return;
        }

        if (!verificationId) {
            showAlert("Please enter Verification ID manually or select suggestion.", "danger");
            verificationIdInput.focus();
            return;
        }

        if (!pageLink) {
            showAlert("Please enter Homepage Link manually or select suggestion.", "danger");
            pageLinkInput.focus();
            return;
        }

        if (!/^[a-z0-9_]+$/.test(verificationId)) {
            showAlert("Verification ID can contain only lowercase letters, numbers, and underscore.", "danger");
            verificationIdInput.focus();
            return;
        }

        if (
            pageLink.toLowerCase().startsWith("javascript:") ||
            pageLink.toLowerCase().startsWith("data:")
        ) {
            showAlert("Invalid Homepage Link.", "danger");
            pageLinkInput.focus();
            return;
        }

        try {
            saveBuildingBtn.disabled = true;
            saveBuildingBtn.textContent = "Saving...";

            const response = await fetch(`${API_BASE_URL}/building_pages/create.php`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    campus_table: CAMPUS_TABLE,
                    building_name: buildingName,
                    verification_id: verificationId,
                    page_link: pageLink
                })
            });

            const result = await response.json();

            if (!response.ok || !result.status) {
                throw new Error(result.message || "Failed to save building.");
            }

            closeModal();
            showAlert(result.message || "Building connected successfully.", "success");
            loadBuildings();
        } catch (error) {
            console.error(error);
            showAlert(error.message || "Failed to save building.", "danger");
        } finally {
            saveBuildingBtn.disabled = false;
            saveBuildingBtn.textContent = "Save Building";
        }
    }

    async function removeBuilding(id, buildingName) {
        const confirmed = window.confirm(`Remove ${buildingName}?`);

        if (!confirmed) {
            return;
        }

        hideAlert();
        hideAllSuggestions();

        try {
            const response = await fetch(`${API_BASE_URL}/building_pages/delete.php`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: id
                })
            });

            const result = await response.json();

            if (!response.ok || !result.status) {
                throw new Error(result.message || "Failed to remove building.");
            }

            showAlert(result.message || "Building removed successfully.", "success");
            loadBuildings();
        } catch (error) {
            console.error(error);
            showAlert(error.message || "Failed to remove building.", "danger");
        }
    }

    function showAlert(message, type = "danger") {
        if (!pageAlert) return;

        if (alertTimeoutId) {
            clearTimeout(alertTimeoutId);
        }

        pageAlert.textContent = message;
        pageAlert.className = `alert ${type}`;

        alertTimeoutId = setTimeout(() => {
            hideAlert();
        }, 4500);
    }

    function hideAlert() {
        if (!pageAlert) return;

        pageAlert.textContent = "";
        pageAlert.className = "alert hidden";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, "&#096;");
    }
});