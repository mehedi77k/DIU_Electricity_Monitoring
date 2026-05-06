document.addEventListener("DOMContentLoaded", () => {
    const levelTitle = document.getElementById("levelTitle");
    const pageAlert = document.getElementById("pageAlert");
    const roomGrid = document.getElementById("roomGrid");

    const addRoomBtn = document.getElementById("addRoomBtn");
    const roomModal = document.getElementById("roomModal");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const modalCancelBtn = document.getElementById("modalCancelBtn");

    const roomForm = document.getElementById("roomForm");
    const approvedRoomSelect = document.getElementById("approvedRoomSelect");
    const roomNoInput = document.getElementById("roomNo");
    const roomVerificationInput = document.getElementById("roomVerificationId");
    const roomPageLinkInput = document.getElementById("roomPageLink");
    const saveRoomBtn = document.getElementById("saveRoomBtn");

    const context = getPageContext();

    let approvedRooms = [];
    let activeRooms = [];

    init();

    async function init() {
        if (!context.isValid) {
            showAlert("Could not detect building and level from this URL.", "danger");
            return;
        }

        levelTitle.textContent = `${formatTitle(context.buildingVerificationId)} - ${formatTitle(context.floorVerificationId)}`;

        bindEvents();

        await reloadRooms();
    }

    function getPageContext() {
        const parts = window.location.pathname
            .split("/")
            .map(part => part.trim())
            .filter(Boolean);

        const cityIndex = parts.indexOf("daffodil_smart_city");
        const buildingKeywordIndex = parts.indexOf("buildings");
        const floorKeywordIndex = parts.indexOf("floors");

        const buildingVerificationId = buildingKeywordIndex >= 0
            ? parts[buildingKeywordIndex + 1] || ""
            : "";

        const floorVerificationId = floorKeywordIndex >= 0
            ? parts[floorKeywordIndex + 1] || ""
            : "";

        const projectBasePath = cityIndex > 0
            ? "/" + parts.slice(0, cityIndex).join("/")
            : "";

        return {
            isValid: Boolean(cityIndex >= 0 && buildingVerificationId && floorVerificationId),
            projectBasePath,
            apiBase: `${window.location.origin}${projectBasePath}/electricity_api`,
            cityBase: `${window.location.origin}${projectBasePath}/daffodil_smart_city`,
            buildingVerificationId,
            floorVerificationId
        };
    }

    function bindEvents() {
        addRoomBtn.addEventListener("click", openModal);
        modalCloseBtn.addEventListener("click", closeModal);
        modalCancelBtn.addEventListener("click", closeModal);

        approvedRoomSelect.addEventListener("change", fillSelectedRoom);
        roomForm.addEventListener("submit", saveRoom);

        roomModal.addEventListener("click", event => {
            if (event.target === roomModal) {
                closeModal();
            }
        });
    }

    async function reloadRooms() {
        await Promise.all([
            loadApprovedRooms(),
            loadActiveRooms()
        ]);

        renderApprovedRoomOptions();
        renderActiveRooms();
    }

    async function loadApprovedRooms() {
        const url =
            `${context.apiBase}/room_catalog/list.php` +
            `?building_verification_id=${encodeURIComponent(context.buildingVerificationId)}` +
            `&level_verification_id=${encodeURIComponent(context.floorVerificationId)}`;

        const response = await fetchJson(url);

        approvedRooms = response.data && Array.isArray(response.data.rooms)
            ? response.data.rooms
            : [];
    }

    async function loadActiveRooms() {
        const url =
            `${context.apiBase}/room_pages/list.php` +
            `?building_verification_id=${encodeURIComponent(context.buildingVerificationId)}` +
            `&floor_verification_id=${encodeURIComponent(context.floorVerificationId)}`;

        const response = await fetchJson(url);

        activeRooms = response.data && Array.isArray(response.data.rooms)
            ? response.data.rooms
            : [];
    }

    function renderApprovedRoomOptions() {
        approvedRoomSelect.innerHTML = '<option value="">Select approved room</option>';

        if (!approvedRooms.length) {
            const option = document.createElement("option");
            option.value = "";
            option.disabled = true;
            option.textContent = "No approved room found for this level";
            approvedRoomSelect.appendChild(option);
            return;
        }

        const activeRoomIds = new Set(
            activeRooms.map(room => String(room.room_verification_id))
        );

        approvedRooms.forEach((room, index) => {
            const roomName = room.room_name || room.name || "";
            const roomVerificationId = room.room_verification_id || room.slug || "";

            const alreadyAdded = activeRoomIds.has(String(roomVerificationId));
            const status = alreadyAdded ? "already added" : "available";

            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = `${roomName} (${roomVerificationId}) — ${status}`;

            approvedRoomSelect.appendChild(option);
        });
    }

    function fillSelectedRoom() {
        const selectedIndex = Number(approvedRoomSelect.value);

        if (Number.isNaN(selectedIndex) || !approvedRooms[selectedIndex]) {
            clearFormFields();
            return;
        }

        const room = approvedRooms[selectedIndex];

        const roomName = room.room_name || room.name || "";
        const roomVerificationId = room.room_verification_id || room.slug || "";

        roomNoInput.value = roomName;
        roomVerificationInput.value = roomVerificationId;
        roomPageLinkInput.value = buildRoomLink(roomVerificationId);
    }

    function buildRoomLink(roomVerificationId) {
        return `${context.cityBase}/buildings/${context.buildingVerificationId}/floors/${context.floorVerificationId}/rooms/${roomVerificationId}/`;
    }

    async function saveRoom(event) {
        event.preventDefault();

        const selectedIndex = Number(approvedRoomSelect.value);

        if (Number.isNaN(selectedIndex) || !approvedRooms[selectedIndex]) {
            showAlert("Select an approved room first.", "danger");
            return;
        }

        const roomName = roomNoInput.value.trim();
        const roomVerificationId = roomVerificationInput.value.trim();
        const pageLink = roomPageLinkInput.value.trim();

        if (!roomName || !roomVerificationId || !pageLink) {
            showAlert("Room name, verification ID, and homepage link are required.", "danger");
            return;
        }

        saveRoomBtn.disabled = true;
        saveRoomBtn.textContent = "Saving...";

        try {
            const response = await fetchJson(`${context.apiBase}/room_pages/create.php`, {
                method: "POST",
                body: JSON.stringify({
                    building_verification_id: context.buildingVerificationId,
                    floor_verification_id: context.floorVerificationId,
                    room_name: roomName,
                    room_verification_id: roomVerificationId,
                    page_link: pageLink
                })
            });

            closeModal();

            showAlert(response.message || "Room added successfully.", "success");

            await reloadRooms();
        } catch (error) {
            showAlert(error.message || "Room save failed.", "danger");
        } finally {
            saveRoomBtn.disabled = false;
            saveRoomBtn.textContent = "Save Room";
        }
    }

    function renderActiveRooms() {
        roomGrid.innerHTML = "";

        if (!activeRooms.length) {
            roomGrid.innerHTML = `
                <div class="empty-state">
                    No room has been added under this level yet.
                </div>
            `;
            return;
        }

        activeRooms.forEach(room => {
            const card = document.createElement("article");
            card.className = "room-card";

            card.innerHTML = `
                <h3>${escapeHtml(room.room_name)}</h3>

                <div class="room-meta">
                    <p><strong>Room ID:</strong> ${escapeHtml(room.room_verification_id)}</p>
                    <p><strong>Building ID:</strong> ${escapeHtml(room.building_verification_id)}</p>
                    <p><strong>Level ID:</strong> ${escapeHtml(room.floor_verification_id)}</p>
                    <p><strong>Link:</strong> ${escapeHtml(room.page_link)}</p>
                </div>

                <div class="room-actions">
                    <a class="btn btn-primary" href="${escapeAttribute(room.page_link)}">Open Room</a>
                    <button class="btn btn-danger" type="button" data-delete-room="${Number(room.id)}">Remove</button>
                </div>
            `;

            roomGrid.appendChild(card);
        });

        roomGrid.querySelectorAll("[data-delete-room]").forEach(button => {
            button.addEventListener("click", async () => {
                const id = Number(button.dataset.deleteRoom);

                if (!id) return;

                if (!confirm("Remove this room from this level?")) {
                    return;
                }

                await deleteRoom(id);
            });
        });
    }

    async function deleteRoom(id) {
        try {
            const response = await fetchJson(`${context.apiBase}/room_pages/delete.php`, {
                method: "POST",
                body: JSON.stringify({ id })
            });

            showAlert(response.message || "Room removed successfully.", "success");

            await reloadRooms();
        } catch (error) {
            showAlert(error.message || "Could not remove room.", "danger");
        }
    }

    function openModal() {
        approvedRoomSelect.value = "";
        clearFormFields();
        renderApprovedRoomOptions();
        roomModal.classList.remove("hidden");
    }

    function closeModal() {
        roomModal.classList.add("hidden");
        approvedRoomSelect.value = "";
        clearFormFields();
    }

    function clearFormFields() {
        roomNoInput.value = "";
        roomVerificationInput.value = "";
        roomPageLinkInput.value = "";
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            credentials: "include",
            ...options,
            headers: {
                "Accept": "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers || {})
            }
        });

        let payload;

        try {
            payload = await response.json();
        } catch (error) {
            throw new Error("Invalid JSON response from API.");
        }

        if (!response.ok || payload.status === false || payload.success === false) {
            throw new Error(payload.message || "API request failed.");
        }

        return payload;
    }

    function showAlert(message, type = "danger") {
        pageAlert.textContent = message;
        pageAlert.className = `alert ${type}`;

        setTimeout(() => {
            pageAlert.textContent = "";
            pageAlert.className = "alert hidden";
        }, 5000);
    }

    function formatTitle(value) {
        return String(value || "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, char => char.toUpperCase());
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
        return escapeHtml(value);
    }
});