console.log("Room manager JS loaded");

const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;

const BUILDING_VERIFICATION_ID = getBuildingSlugFromUrl();
const FLOOR_VERIFICATION_ID = getFloorSlugFromUrl();

document.addEventListener("DOMContentLoaded", () => {
    const burgerBtn = document.getElementById("burgerBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const pageAlert = document.getElementById("pageAlert");

    const addRoomBtn = document.getElementById("addRoomBtn");
    const roomModal = document.getElementById("roomModal");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const modalCancelBtn = document.getElementById("modalCancelBtn");

    const roomForm = document.getElementById("roomForm");
    const roomGrid = document.getElementById("roomGrid");

    const roomNameInput = document.getElementById("roomName");
    const roomVerificationIdInput = document.getElementById("roomVerificationId");
    const roomPageLinkInput = document.getElementById("roomPageLink");
    const saveRoomBtn = document.getElementById("saveRoomBtn");

    let alertTimeoutId = null;

    const buildingNameMap = {
        admission_building: "Admission Building",
        daffodil_islamic_center: "Daffodil Islamic Center (Mosque Complex)",
        dean_building: "Dean Building",
        dsc_food_court: "DSC Food Court",
        innovation_lab: "Innovation Lab",
        inspiration_building: "Inspiration Building",
        knowledge_tower: "Knowledge Tower",
        medical_center: "Medical Center",
        rasg_1: "Rowshan Ara Scholar Garden-1 (RASG-1)",
        rasg_2: "Rowshan Ara Scholar Garden-2 (RASG-2)",
        sadhinota_sommelon_kendro: "Sadhinota Sommelon Kendro (Main Auditorium)",
        yksg_1: "Yunus Khan Scholar Garden-1 (YKSG-1)",
        yksg_2: "Yunus Khan Scholar Garden-2 (YKSG-2)",
        yksg_3: "Yunus Khan Scholar Garden-3 (YKSG-3)"
    };

    setPageTitle();
    bindEvents();
    loadRooms();

    function setPageTitle() {
        const buildingName = buildingNameMap[BUILDING_VERIFICATION_ID] || toTitleCase(BUILDING_VERIFICATION_ID);
        const floorName = toTitleCase(FLOOR_VERIFICATION_ID);

        document.title = `${floorName} | ${buildingName}`;

        if (pageTitle) {
            pageTitle.textContent = `${buildingName} - ${floorName}`;
        }

        if (pageSubtitle) {
            pageSubtitle.textContent = "Add and manage rooms under this level.";
        }
    }

    function bindEvents() {
        if (burgerBtn && sidebar && sidebarOverlay) {
            burgerBtn.addEventListener("click", toggleSidebar);
            sidebarOverlay.addEventListener("click", closeSidebar);
        }

        if (addRoomBtn) {
            addRoomBtn.addEventListener("click", openModal);
        }

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener("click", closeModal);
        }

        if (modalCancelBtn) {
            modalCancelBtn.addEventListener("click", closeModal);
        }

        if (roomModal) {
            roomModal.addEventListener("click", (event) => {
                if (event.target === roomModal) {
                    closeModal();
                }
            });
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSidebar();
                closeModal();
            }
        });

        if (roomForm) {
            roomForm.addEventListener("submit", handleCreateRoom);
        }

        if (roomNameInput) {
            roomNameInput.addEventListener("input", autoSuggestRoomFields);
        }
    }

    function autoSuggestRoomFields() {
        const roomName = roomNameInput.value.trim();

        if (!roomName) {
            return;
        }

        const slug = slugify(roomName);

        if (!roomVerificationIdInput.value.trim()) {
            roomVerificationIdInput.value = slug;
        }

        if (!roomPageLinkInput.value.trim()) {
            roomPageLinkInput.value = makeRoomHomepageLink(slug);
        }
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

        if (!roomModal) return;

        if (roomForm) {
            roomForm.reset();
        }

        roomModal.classList.remove("hidden");
        document.body.classList.add("modal-open");

        setTimeout(() => {
            roomNameInput?.focus();
        }, 50);
    }

    function closeModal() {
        if (!roomModal) return;

        roomModal.classList.add("hidden");
        document.body.classList.remove("modal-open");

        if (roomForm) {
            roomForm.reset();
        }

        if (saveRoomBtn) {
            saveRoomBtn.disabled = false;
            saveRoomBtn.textContent = "Save Room";
        }
    }

    async function loadRooms() {
        hideAlert();

        if (!roomGrid) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/room_pages/list.php?building_verification_id=${encodeURIComponent(BUILDING_VERIFICATION_ID)}&floor_verification_id=${encodeURIComponent(FLOOR_VERIFICATION_ID)}`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const result = await response.json();

            if (!response.ok || !result.status) {
                throw new Error(result.message || "Failed to load rooms.");
            }

            const rooms = result.data.rooms || [];
            renderRooms(rooms);
        } catch (error) {
            console.error(error);
            renderRooms([]);
            showAlert("Could not load rooms. Check electricity_api/room_pages/list.php.", "danger");
        }
    }

    function renderRooms(rooms) {
        roomGrid.innerHTML = "";

        if (!rooms.length) {
            roomGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚡</div>
                    <h3>No room added yet</h3>
                    <p>Click “Add Rooms” and connect a room homepage.</p>
                </div>
            `;
            return;
        }

        rooms.forEach((room) => {
            const pageLink = String(room.page_link || "").trim();

            const card = document.createElement("article");
            card.className = "device-card building-card";

            card.innerHTML = `
                <div class="device-card-head">
                    <div>
                        <h3>${escapeHtml(room.room_name)}</h3>
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
                        data-id="${room.id}"
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
                    showAlert("Homepage link not found for this room.", "danger");
                });
            }

            removeBtn.addEventListener("click", () => {
                removeRoom(room.id, room.room_name);
            });

            roomGrid.appendChild(card);
        });
    }

    async function handleCreateRoom(event) {
        event.preventDefault();
        hideAlert();

        const roomName = roomNameInput.value.trim();
        const roomVerificationId = roomVerificationIdInput.value.trim();
        const pageLink = roomPageLinkInput.value.trim();

        if (!roomName) {
            showAlert("Please enter Room Name.", "danger");
            roomNameInput.focus();
            return;
        }

        if (!roomVerificationId) {
            showAlert("Please enter Room Verification ID.", "danger");
            roomVerificationIdInput.focus();
            return;
        }

        if (!/^[a-z0-9_]+$/.test(roomVerificationId)) {
            showAlert("Room Verification ID can contain only lowercase letters, numbers, and underscore.", "danger");
            roomVerificationIdInput.focus();
            return;
        }

        if (!pageLink) {
            showAlert("Please enter Room Homepage Link.", "danger");
            roomPageLinkInput.focus();
            return;
        }

        if (
            pageLink.toLowerCase().startsWith("javascript:") ||
            pageLink.toLowerCase().startsWith("data:")
        ) {
            showAlert("Invalid Homepage Link.", "danger");
            roomPageLinkInput.focus();
            return;
        }

        try {
            saveRoomBtn.disabled = true;
            saveRoomBtn.textContent = "Saving...";

            const response = await fetch(`${API_BASE_URL}/room_pages/create.php`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    building_verification_id: BUILDING_VERIFICATION_ID,
                    floor_verification_id: FLOOR_VERIFICATION_ID,
                    room_name: roomName,
                    room_verification_id: roomVerificationId,
                    page_link: pageLink
                })
            });

            const result = await response.json();

            if (!response.ok || !result.status) {
                throw new Error(result.message || "Failed to save room.");
            }

            closeModal();
            showAlert(result.message || "Room connected successfully.", "success");
            loadRooms();
        } catch (error) {
            console.error(error);
            showAlert(error.message || "Failed to save room.", "danger");
        } finally {
            saveRoomBtn.disabled = false;
            saveRoomBtn.textContent = "Save Room";
        }
    }

    async function removeRoom(id, roomName) {
        const confirmed = window.confirm(`Remove ${roomName}?`);

        if (!confirmed) return;

        hideAlert();

        try {
            const response = await fetch(`${API_BASE_URL}/room_pages/delete.php`, {
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
                throw new Error(result.message || "Failed to remove room.");
            }

            showAlert(result.message || "Room removed successfully.", "success");
            loadRooms();
        } catch (error) {
            console.error(error);
            showAlert(error.message || "Failed to remove room.", "danger");
        }
    }

    function makeRoomHomepageLink(roomSlug) {
        return `${window.location.origin}${PROJECT_ROOT}/daffodil_smart_city/buildings/${BUILDING_VERIFICATION_ID}/floors/${FLOOR_VERIFICATION_ID}/rooms/${roomSlug}/`;
    }

    function getBuildingSlugFromUrl() {
        const parts = window.location.pathname.split("/").filter(Boolean);
        const buildingIndex = parts.indexOf("buildings");

        if (buildingIndex === -1 || !parts[buildingIndex + 1]) {
            return "unknown_building";
        }

        return parts[buildingIndex + 1];
    }

    function getFloorSlugFromUrl() {
        const parts = window.location.pathname.split("/").filter(Boolean);
        const floorIndex = parts.indexOf("floors");

        if (floorIndex === -1 || !parts[floorIndex + 1]) {
            return "unknown_floor";
        }

        return parts[floorIndex + 1];
    }

    function slugify(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function toTitleCase(value) {
        return String(value || "")
            .replace(/_/g, " ")
            .replace(/\w\S*/g, (text) => {
                return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            });
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