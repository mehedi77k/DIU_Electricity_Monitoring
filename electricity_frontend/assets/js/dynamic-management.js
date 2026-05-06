document.addEventListener("DOMContentLoaded", () => {
    const adminName = document.getElementById("adminName");
    const logoutBtn = document.getElementById("logoutBtn");

    const pageAlert = document.getElementById("pageAlert");
    const formAlert = document.getElementById("formAlert");

    const dynamicForm = document.getElementById("dynamicForm");
    const submitBtn = document.getElementById("submitBtn");

    const typeInput = document.getElementById("type");
    const parentBuildingGroup = document.getElementById("parentBuildingGroup");
    const parentLevelGroup = document.getElementById("parentLevelGroup");

    const buildingVerificationIdInput = document.getElementById("buildingVerificationId");
    const levelVerificationIdInput = document.getElementById("levelVerificationId");
    const catalogSelect = document.getElementById("catalogSelect");

    const nameInput = document.getElementById("name");
    const verificationIdInput = document.getElementById("verificationId");
    const pageLinkInput = document.getElementById("pageLink");

    const buildingList = document.getElementById("buildingList");
    const levelList = document.getElementById("levelList");
    const roomList = document.getElementById("roomList");

    let data = {
        base_url: "",
        active_buildings: [],
        active_levels: [],
        active_rooms: [],
        building_catalog: [],
        level_catalog: [],
        room_catalog: []
    };

    let currentCatalogRows = [];

    init();

    async function init() {
        await requireLogin();
        bindEvents();
        await reloadAll();
    }

    async function requireLogin() {
        try {
            const response = await apiFetch("/auth/me.php");
            const admin = response.data.admin || {};
            adminName.textContent = admin.name || "Admin";
        } catch (error) {
            window.location.href = "index.html";
        }
    }

    function bindEvents() {
        logoutBtn.addEventListener("click", logout);
        typeInput.addEventListener("change", handleTypeChange);
        buildingVerificationIdInput.addEventListener("change", handleParentBuildingChange);
        levelVerificationIdInput.addEventListener("change", handleParentLevelChange);
        catalogSelect.addEventListener("change", handleCatalogSelect);
        dynamicForm.addEventListener("submit", submitForm);
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

    async function reloadAll() {
        try {
            const response = await apiFetch("/dynamic/options.php");

            data = {
                base_url: response.data.base_url || "",
                active_buildings: response.data.active_buildings || [],
                active_levels: response.data.active_levels || [],
                active_rooms: response.data.active_rooms || [],
                building_catalog: response.data.building_catalog || [],
                level_catalog: response.data.level_catalog || [],
                room_catalog: response.data.room_catalog || []
            };

            renderParentBuildings();
            renderParentLevels();
            renderCatalogSelect();
            renderActiveHierarchy();

            hideAlert(pageAlert);
        } catch (error) {
            showAlert(pageAlert, error.message || "Failed to load dynamic data.");
        }
    }

    function handleTypeChange() {
        hideAlert(formAlert);
        resetFilledFields();

        const type = typeInput.value;

        parentBuildingGroup.classList.add("hidden");
        parentLevelGroup.classList.add("hidden");

        buildingVerificationIdInput.required = false;
        levelVerificationIdInput.required = false;

        if (type === "level") {
            parentBuildingGroup.classList.remove("hidden");
            buildingVerificationIdInput.required = true;
        }

        if (type === "room") {
            parentBuildingGroup.classList.remove("hidden");
            parentLevelGroup.classList.remove("hidden");
            buildingVerificationIdInput.required = true;
            levelVerificationIdInput.required = true;
        }

        renderCatalogSelect();
    }

    function handleParentBuildingChange() {
        resetFilledFields();
        renderParentLevels();
        renderCatalogSelect();
    }

    function handleParentLevelChange() {
        resetFilledFields();
        renderCatalogSelect();
    }

    function handleCatalogSelect() {
        resetFilledFields();

        const selectedIndex = Number(catalogSelect.value);

        if (Number.isNaN(selectedIndex) || !currentCatalogRows[selectedIndex]) {
            return;
        }

        const type = typeInput.value;
        const row = currentCatalogRows[selectedIndex];

        if (type === "building") {
            nameInput.value = row.building_name;
            verificationIdInput.value = row.building_verification_id;
            pageLinkInput.value = buildBuildingLink(row.campus_table, row.building_verification_id);
        }

        if (type === "level") {
            nameInput.value = row.level_name;
            verificationIdInput.value = row.level_verification_id;

            const building = getSelectedBuilding();

            if (building) {
                pageLinkInput.value = buildLevelLink(
                    building.campus_table,
                    row.building_verification_id,
                    row.level_verification_id
                );
            }
        }

        if (type === "room") {
            nameInput.value = row.room_name;
            verificationIdInput.value = row.room_verification_id;

            const building = getSelectedBuilding();

            if (building) {
                pageLinkInput.value = buildRoomLink(
                    building.campus_table,
                    row.building_verification_id,
                    row.level_verification_id,
                    row.room_verification_id
                );
            }
        }
    }

    function renderParentBuildings() {
        buildingVerificationIdInput.innerHTML = '<option value="">Select active building</option>';

        data.active_buildings.forEach(building => {
            const option = document.createElement("option");
            option.value = building.building_verification_id;
            option.textContent = `${building.building_name} (${building.building_verification_id})`;
            buildingVerificationIdInput.appendChild(option);
        });
    }

    function renderParentLevels() {
        const selectedBuildingId = buildingVerificationIdInput.value;

        levelVerificationIdInput.innerHTML = '<option value="">Select active level</option>';

        data.active_levels
            .filter(level => level.building_verification_id === selectedBuildingId)
            .forEach(level => {
                const option = document.createElement("option");
                option.value = level.floor_verification_id;
                option.textContent = `${level.floor_name} (${level.floor_verification_id})`;
                levelVerificationIdInput.appendChild(option);
            });
    }

    function renderCatalogSelect() {
        const type = typeInput.value;

        catalogSelect.innerHTML = '<option value="">Select approved item</option>';
        currentCatalogRows = [];

        if (!type) {
            return;
        }

        if (type === "building") {
            currentCatalogRows = data.building_catalog;

            currentCatalogRows.forEach((row, index) => {
                const status = Number(row.page_is_active) === 1 ? "already active" : "can activate";
                addCatalogOption(index, `${row.building_name} (${row.building_verification_id}) — ${status}`);
            });
        }

        if (type === "level") {
            const selectedBuildingId = buildingVerificationIdInput.value;

            if (!selectedBuildingId) {
                addDisabledOption("Select a parent building first");
                return;
            }

            currentCatalogRows = data.level_catalog.filter(row => {
                return row.building_verification_id === selectedBuildingId;
            });

            if (!currentCatalogRows.length) {
                addDisabledOption("No approved level exists for this building");
                return;
            }

            currentCatalogRows.forEach((row, index) => {
                const status = Number(row.page_is_active) === 1 ? "already active" : "can activate";
                addCatalogOption(index, `${row.level_name} (${row.level_verification_id}) — ${status}`);
            });
        }

        if (type === "room") {
            const selectedBuildingId = buildingVerificationIdInput.value;
            const selectedLevelId = levelVerificationIdInput.value;

            if (!selectedBuildingId) {
                addDisabledOption("Select a parent building first");
                return;
            }

            if (!selectedLevelId) {
                addDisabledOption("Select a parent level first");
                return;
            }

            currentCatalogRows = data.room_catalog.filter(row => {
                return row.building_verification_id === selectedBuildingId &&
                    row.level_verification_id === selectedLevelId;
            });

            if (!currentCatalogRows.length) {
                addDisabledOption("No approved room exists for this level");
                return;
            }

            currentCatalogRows.forEach((row, index) => {
                const status = Number(row.page_is_active) === 1 ? "already active" : "can activate";
                addCatalogOption(index, `${row.room_name} (${row.room_verification_id}) — ${status}`);
            });
        }
    }

    function addCatalogOption(index, label) {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = label;
        catalogSelect.appendChild(option);
    }

    function addDisabledOption(label) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = label;
        option.disabled = true;
        catalogSelect.appendChild(option);
    }

    async function submitForm(event) {
        event.preventDefault();

        hideAlert(formAlert);
        hideAlert(pageAlert);

        const type = typeInput.value;
        const name = nameInput.value.trim();
        const verificationId = verificationIdInput.value.trim();
        const link = pageLinkInput.value.trim();
        const buildingVerificationId = buildingVerificationIdInput.value.trim();
        const levelVerificationId = levelVerificationIdInput.value.trim();

        if (!type) {
            showAlert(formAlert, "Select entity type.");
            return;
        }

        if (!catalogSelect.value) {
            showAlert(formAlert, "Select an approved item from the catalog.");
            return;
        }

        if (!name || !verificationId || !link) {
            showAlert(formAlert, "Name, verification ID, and link must be filled automatically before submit.");
            return;
        }

        if (type === "level" && !buildingVerificationId) {
            showAlert(formAlert, "Select parent building first.");
            return;
        }

        if (type === "room" && (!buildingVerificationId || !levelVerificationId)) {
            showAlert(formAlert, "Select parent building and parent level first.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            const selectedBuilding = getSelectedBuilding();

            const response = await apiFetch("/dynamic/create.php", {
                method: "POST",
                body: JSON.stringify({
                    type,
                    name,
                    verification_id: verificationId,
                    link,
                    campus_table: selectedBuilding ? selectedBuilding.campus_table : "daffodil_smart_city",
                    building_verification_id: buildingVerificationId,
                    level_verification_id: levelVerificationId
                })
            });

            showAlert(pageAlert, `${response.message} ${response.data.page_link || ""}`, "success");

            dynamicForm.reset();
            resetFilledFields();
            handleTypeChange();

            await reloadAll();
        } catch (error) {
            showAlert(formAlert, error.message || "Submission failed.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
        }
    }

    function renderActiveHierarchy() {
        renderBuildings();
        renderLevels();
        renderRooms();
    }

    function renderBuildings() {
        buildingList.innerHTML = "";

        if (!data.active_buildings.length) {
            buildingList.innerHTML = '<div class="empty">No active building found.</div>';
            return;
        }

        data.active_buildings.forEach(building => {
            const item = document.createElement("div");
            item.className = "item";

            item.innerHTML = `
                <div class="item-title">${escapeHtml(building.building_name)}</div>
                <div class="item-meta">
                    Verification ID: ${escapeHtml(building.building_verification_id)}<br>
                    Link: ${escapeHtml(building.page_link)}
                </div>
                <div class="item-actions">
                    <a class="btn btn-secondary" href="${escapeHtml(building.page_link)}" target="_blank">Open</a>
                    <button class="btn btn-danger" data-type="building" data-id="${Number(building.building_page_id)}">Deactivate</button>
                </div>
            `;

            buildingList.appendChild(item);
        });

        bindDeactivateButtons(buildingList);
    }

    function renderLevels() {
        levelList.innerHTML = "";

        if (!data.active_levels.length) {
            levelList.innerHTML = '<div class="empty">No active level found.</div>';
            return;
        }

        data.active_levels.forEach(level => {
            const item = document.createElement("div");
            item.className = "item";

            item.innerHTML = `
                <div class="item-title">${escapeHtml(level.floor_name)}</div>
                <div class="item-meta">
                    Building ID: ${escapeHtml(level.building_verification_id)}<br>
                    Level ID: ${escapeHtml(level.floor_verification_id)}<br>
                    Link: ${escapeHtml(level.page_link)}
                </div>
                <div class="item-actions">
                    <a class="btn btn-secondary" href="${escapeHtml(level.page_link)}" target="_blank">Open</a>
                    <button class="btn btn-danger" data-type="level" data-id="${Number(level.floor_page_id)}">Deactivate</button>
                </div>
            `;

            levelList.appendChild(item);
        });

        bindDeactivateButtons(levelList);
    }

    function renderRooms() {
        roomList.innerHTML = "";

        if (!data.active_rooms.length) {
            roomList.innerHTML = '<div class="empty">No active room found.</div>';
            return;
        }

        data.active_rooms.forEach(room => {
            const item = document.createElement("div");
            item.className = "item";

            item.innerHTML = `
                <div class="item-title">${escapeHtml(room.room_name)}</div>
                <div class="item-meta">
                    Building ID: ${escapeHtml(room.building_verification_id)}<br>
                    Level ID: ${escapeHtml(room.floor_verification_id)}<br>
                    Room ID: ${escapeHtml(room.room_verification_id)}<br>
                    Link: ${escapeHtml(room.page_link)}
                </div>
                <div class="item-actions">
                    <a class="btn btn-secondary" href="${escapeHtml(room.page_link)}" target="_blank">Open</a>
                    <button class="btn btn-danger" data-type="room" data-id="${Number(room.room_page_id)}">Deactivate</button>
                </div>
            `;

            roomList.appendChild(item);
        });

        bindDeactivateButtons(roomList);
    }

    function bindDeactivateButtons(container) {
        container.querySelectorAll("button[data-type][data-id]").forEach(button => {
            button.addEventListener("click", async () => {
                const type = button.dataset.type;
                const id = Number(button.dataset.id);

                if (!confirm(`Deactivate this ${type}?`)) {
                    return;
                }

                try {
                    await apiFetch("/dynamic/deactivate.php", {
                        method: "POST",
                        body: JSON.stringify({
                            type,
                            id
                        })
                    });

                    showAlert(pageAlert, `${capitalize(type)} deactivated successfully.`, "success");
                    await reloadAll();
                } catch (error) {
                    showAlert(pageAlert, error.message || "Failed to deactivate item.");
                }
            });
        });
    }

    function resetFilledFields() {
        nameInput.value = "";
        verificationIdInput.value = "";
        pageLinkInput.value = "";
    }

    function getSelectedBuilding() {
        const selectedBuildingId = buildingVerificationIdInput.value;

        if (!selectedBuildingId) {
            return null;
        }

        return data.active_buildings.find(building => {
            return building.building_verification_id === selectedBuildingId;
        }) || null;
    }

    function buildBuildingLink(campusTable, buildingId) {
        return `${data.base_url}/${campusTable}/buildings/${buildingId}/`;
    }

    function buildLevelLink(campusTable, buildingId, levelId) {
        return `${data.base_url}/${campusTable}/buildings/${buildingId}/floors/${levelId}/`;
    }

    function buildRoomLink(campusTable, buildingId, levelId, roomId) {
        return `${data.base_url}/${campusTable}/buildings/${buildingId}/floors/${levelId}/rooms/${roomId}/`;
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

    function capitalize(value) {
        if (!value) return "";
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
});