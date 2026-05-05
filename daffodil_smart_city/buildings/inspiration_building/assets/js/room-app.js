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

  const roomNoInput = document.getElementById("roomNo");
  const roomVerificationIdInput = document.getElementById("roomVerificationId");
  const roomPageLinkInput = document.getElementById("roomPageLink");

  const roomNoSuggestions = document.getElementById("roomNoSuggestions");
  const roomVerificationSuggestions = document.getElementById("roomVerificationSuggestions");
  const roomPageLinkSuggestions = document.getElementById("roomPageLinkSuggestions");

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

  const roomOptions = [
    { roomNo: "Room 101", slug: "room_101" },
    { roomNo: "Room 102", slug: "room_102" },
    { roomNo: "Room 103", slug: "room_103" },
    { roomNo: "Room 104", slug: "room_104" },
    { roomNo: "Room 105", slug: "room_105" },
    { roomNo: "Room 106", slug: "room_106" },
    { roomNo: "Room 107", slug: "room_107" },
    { roomNo: "Room 108", slug: "room_108" },
    { roomNo: "Room 109", slug: "room_109" },
    { roomNo: "Room 110", slug: "room_110" },
    { roomNo: "Room 111", slug: "room_111" },
    { roomNo: "Room 112", slug: "room_112" },
    { roomNo: "Room 201", slug: "room_201" },
    { roomNo: "Room 202", slug: "room_202" },
    { roomNo: "Room 203", slug: "room_203" },
    { roomNo: "Room 204", slug: "room_204" },
    { roomNo: "Room 205", slug: "room_205" },
    { roomNo: "Room 206", slug: "room_206" },
    { roomNo: "Lab 101", slug: "lab_101" },
    { roomNo: "Lab 102", slug: "lab_102" },
    { roomNo: "Lab 201", slug: "lab_201" },
    { roomNo: "Lab 202", slug: "lab_202" },
    { roomNo: "Classroom 101", slug: "classroom_101" },
    { roomNo: "Classroom 102", slug: "classroom_102" },
    { roomNo: "Office Room", slug: "office_room" },
    { roomNo: "Server Room", slug: "server_room" },
    { roomNo: "Control Room", slug: "control_room" }
  ];

  setPageTitle();
  bindEvents();
  setupCustomSuggestions();
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
        hideAllSuggestions();
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".suggest-wrap")) {
        hideAllSuggestions();
      }
    });

    if (roomForm) {
      roomForm.addEventListener("submit", handleCreateRoom);
    }

    if (roomNoInput) {
      roomNoInput.addEventListener("input", () => {
        refreshSuggestionIfOpen(roomVerificationSuggestions, getRoomVerificationSuggestions);
        refreshSuggestionIfOpen(roomPageLinkSuggestions, getRoomPageLinkSuggestions);
      });
    }

    if (roomVerificationIdInput) {
      roomVerificationIdInput.addEventListener("input", () => {
        refreshSuggestionIfOpen(roomPageLinkSuggestions, getRoomPageLinkSuggestions);
      });
    }
  }

  function setupCustomSuggestions() {
    setupSuggestionField({
      input: roomNoInput,
      box: roomNoSuggestions,
      getSuggestions: getRoomNoSuggestions,
      onSelect: (value) => {
        roomNoInput.value = value;
        hideSuggestionBox(roomNoSuggestions);
      }
    });

    setupSuggestionField({
      input: roomVerificationIdInput,
      box: roomVerificationSuggestions,
      getSuggestions: getRoomVerificationSuggestions,
      onSelect: (value) => {
        roomVerificationIdInput.value = value;
        hideSuggestionBox(roomVerificationSuggestions);
      }
    });

    setupSuggestionField({
      input: roomPageLinkInput,
      box: roomPageLinkSuggestions,
      getSuggestions: getRoomPageLinkSuggestions,
      onSelect: (value) => {
        roomPageLinkInput.value = value;
        hideSuggestionBox(roomPageLinkSuggestions);
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

  function refreshSuggestionIfOpen(box, getSuggestions) {
    if (!box || box.classList.contains("hidden")) return;

    let relatedInputValue = "";

    if (box === roomVerificationSuggestions && roomVerificationIdInput) {
      relatedInputValue = roomVerificationIdInput.value;
    }

    if (box === roomPageLinkSuggestions && roomPageLinkInput) {
      relatedInputValue = roomPageLinkInput.value;
    }

    const suggestions = getSuggestions(relatedInputValue);

    renderSuggestionBox(box, suggestions, (value) => {
      if (box === roomVerificationSuggestions && roomVerificationIdInput) {
        roomVerificationIdInput.value = value;
      }

      if (box === roomPageLinkSuggestions && roomPageLinkInput) {
        roomPageLinkInput.value = value;
      }

      hideSuggestionBox(box);
    });
  }

  function getRoomNoSuggestions(query = "") {
    const search = query.trim().toLowerCase();

    if (!search) {
      return roomOptions.map((item) => item.roomNo);
    }

    return roomOptions
      .filter((item) => {
        return (
          item.roomNo.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search)
        );
      })
      .map((item) => item.roomNo);
  }

  function getRoomVerificationSuggestions(query = "") {
    const selectedRoom = findRoomByNo(roomNoInput.value);
    const search = query.trim().toLowerCase();

    if (selectedRoom) {
      if (!search || selectedRoom.slug.includes(search)) {
        return [selectedRoom.slug];
      }

      return [];
    }

    const typedRoomSlug = slugifyRoom(roomNoInput.value);

    if (typedRoomSlug) {
      if (!search || typedRoomSlug.includes(search)) {
        return [typedRoomSlug];
      }
    }

    if (!search) {
      return roomOptions.map((item) => item.slug);
    }

    return roomOptions
      .filter((item) => {
        return (
          item.roomNo.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search)
        );
      })
      .map((item) => item.slug);
  }

  function getRoomPageLinkSuggestions(query = "") {
    const selectedRoom = findRoomByNo(roomNoInput.value);
    const search = query.trim().toLowerCase();

    const typedVerificationId = roomVerificationIdInput.value.trim();

    if (typedVerificationId) {
      const link = makeRoomHomepageLink(typedVerificationId);

      if (!search || link.toLowerCase().includes(search)) {
        return [link];
      }

      return [];
    }

    if (selectedRoom) {
      const link = makeRoomHomepageLink(selectedRoom.slug);

      if (!search || link.toLowerCase().includes(search)) {
        return [link];
      }

      return [];
    }

    const typedRoomSlug = slugifyRoom(roomNoInput.value);

    if (typedRoomSlug) {
      const link = makeRoomHomepageLink(typedRoomSlug);

      if (!search || link.toLowerCase().includes(search)) {
        return [link];
      }
    }

    if (!search) {
      return roomOptions.map((item) => makeRoomHomepageLink(item.slug));
    }

    return roomOptions
      .filter((item) => {
        const link = makeRoomHomepageLink(item.slug).toLowerCase();

        return (
          item.roomNo.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search) ||
          link.includes(search)
        );
      })
      .map((item) => makeRoomHomepageLink(item.slug));
  }

  function renderSuggestionBox(box, suggestions, onSelect) {
    hideAllSuggestionsExcept(box);

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
    hideSuggestionBox(roomNoSuggestions);
    hideSuggestionBox(roomVerificationSuggestions);
    hideSuggestionBox(roomPageLinkSuggestions);
  }

  function hideAllSuggestionsExcept(activeBox) {
    if (activeBox !== roomNoSuggestions) {
      hideSuggestionBox(roomNoSuggestions);
    }

    if (activeBox !== roomVerificationSuggestions) {
      hideSuggestionBox(roomVerificationSuggestions);
    }

    if (activeBox !== roomPageLinkSuggestions) {
      hideSuggestionBox(roomPageLinkSuggestions);
    }
  }

  function findRoomByNo(roomNo) {
    const cleanRoomNo = String(roomNo || "").trim().toLowerCase();

    if (!cleanRoomNo) return null;

    return roomOptions.find((item) => item.roomNo.toLowerCase() === cleanRoomNo) || null;
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
    hideAlert();
    hideAllSuggestions();

    if (!roomModal) return;

    if (roomForm) {
      roomForm.reset();
    }

    roomModal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    setTimeout(() => {
      roomNoInput?.focus();
    }, 50);
  }

  function closeModal() {
    if (!roomModal) return;

    hideAllSuggestions();

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
            data-id="${escapeAttribute(room.id)}"
          >
            Remove
          </button>
        </div>
      `;

      const openBtn = card.querySelector(".open-homepage-btn");
      const removeBtn = card.querySelector(".remove-building-btn");

      if (!pageLink && openBtn) {
        openBtn.addEventListener("click", (event) => {
          event.preventDefault();
          showAlert("Homepage link not found for this room.", "danger");
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          removeRoom(room.id, room.room_name);
        });
      }

      roomGrid.appendChild(card);
    });
  }

  async function handleCreateRoom(event) {
    event.preventDefault();

    hideAlert();
    hideAllSuggestions();

    const roomNo = roomNoInput.value.trim();
    const roomVerificationId = roomVerificationIdInput.value.trim();
    const pageLink = roomPageLinkInput.value.trim();

    if (!roomNo) {
      showAlert("Please enter Room No.", "danger");
      roomNoInput.focus();
      return;
    }

    if (!roomVerificationId) {
      showAlert("Please enter Verification ID manually or select suggestion.", "danger");
      roomVerificationIdInput.focus();
      return;
    }

    if (!/^[a-z0-9_]+$/.test(roomVerificationId)) {
      showAlert("Verification ID can contain only lowercase letters, numbers, and underscore.", "danger");
      roomVerificationIdInput.focus();
      return;
    }

    if (!pageLink) {
      showAlert("Please enter Homepage Link manually or select suggestion.", "danger");
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

    const expectedPathPart = `/daffodil_smart_city/buildings/${BUILDING_VERIFICATION_ID}/floors/${FLOOR_VERIFICATION_ID}/rooms/${roomVerificationId}/`;

    if (!pageLink.includes(expectedPathPart)) {
      showAlert(`Homepage Link must contain: ${expectedPathPart}`, "danger");
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
          room_name: roomNo,
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

  async function removeRoom(id, roomNo) {
    const confirmed = window.confirm(`Remove ${roomNo}?`);

    if (!confirmed) return;

    hideAlert();
    hideAllSuggestions();

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
});

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

function slugifyRoom(value) {
  const cleanValue = String(value || "").trim().toLowerCase();

  if (!cleanValue) {
    return "";
  }

  let slug = cleanValue
    .replace(/^room\s*/i, "room_")
    .replace(/^rm\s*/i, "room_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  slug = slug.replace(/_+/g, "_");

  if (/^[0-9]+$/.test(slug)) {
    slug = `room_${slug}`;
  }

  return slug;
}

function toTitleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (text) => {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    });
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
