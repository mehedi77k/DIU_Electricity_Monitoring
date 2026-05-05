const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;
const BUILDING_VERIFICATION_ID = getBuildingSlugFromUrl();
const FLOOR_VERIFICATION_ID = getFloorSlugFromUrl();

let roomOptions = [];
let buildingDisplayName = toTitleCase(BUILDING_VERIFICATION_ID);
let floorDisplayName = toTitleCase(FLOOR_VERIFICATION_ID);

document.addEventListener("DOMContentLoaded", async () => {
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

  bindEvents();
  setupCustomSuggestions();
  setPageTitle();

  const catalogResults = await Promise.allSettled([loadRoomCatalog(), loadLevelName()]);
  catalogResults.forEach((result) => {
    if (result.status === "rejected") console.error(result.reason);
  });

  setPageTitle();
  loadRooms();

  function bindEvents() {
    if (burgerBtn && sidebar && sidebarOverlay) {
      burgerBtn.addEventListener("click", toggleSidebar);
      sidebarOverlay.addEventListener("click", closeSidebar);
    }

    addRoomBtn?.addEventListener("click", openModal);
    modalCloseBtn?.addEventListener("click", closeModal);
    modalCancelBtn?.addEventListener("click", closeModal);

    roomModal?.addEventListener("click", (event) => {
      if (event.target === roomModal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSidebar();
        closeModal();
        hideAllSuggestions();
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".suggest-wrap")) hideAllSuggestions();
    });

    roomForm?.addEventListener("submit", handleCreateRoom);

    roomNoInput?.addEventListener("input", () => syncRoomFieldsFromName(false));

    roomVerificationIdInput?.addEventListener("input", () => {
      roomVerificationIdInput.dataset.auto = "false";
      const verificationId = roomVerificationIdInput.value.trim();
      if (verificationId && (!roomPageLinkInput.value.trim() || roomPageLinkInput.dataset.auto === "true")) {
        roomPageLinkInput.value = makeRoomHomepageLink(verificationId);
        roomPageLinkInput.dataset.auto = "true";
      }
    });

    roomPageLinkInput?.addEventListener("input", () => {
      roomPageLinkInput.dataset.auto = "false";
    });
  }

  async function loadRoomCatalog() {
    const response = await fetch(
      `${API_BASE_URL}/room_catalog/list.php?building_verification_id=${encodeURIComponent(BUILDING_VERIFICATION_ID)}&level_verification_id=${encodeURIComponent(FLOOR_VERIFICATION_ID)}`,
      { method: "GET", credentials: "include" }
    );
    const result = await response.json();
    if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to load room catalog.");

    roomOptions = (result.data?.rooms || []).map((item) => ({
      name: item.name || item.room_name || item.roomNo,
      slug: item.slug || item.room_verification_id,
    })).filter((item) => item.name && item.slug);
  }

  async function loadLevelName() {
    const response = await fetch(`${API_BASE_URL}/level_catalog/list.php?building_verification_id=${encodeURIComponent(BUILDING_VERIFICATION_ID)}`, {
      method: "GET",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok || !isApiSuccess(result)) return;

    const level = (result.data?.levels || []).find((item) => {
      const slug = item.slug || item.level_verification_id;
      return slug === FLOOR_VERIFICATION_ID;
    });

    if (level) floorDisplayName = level.name || level.level_name || floorDisplayName;
  }

  function setPageTitle() {
    document.title = `${floorDisplayName} | ${buildingDisplayName}`;
    if (pageTitle) pageTitle.textContent = `${buildingDisplayName} - ${floorDisplayName}`;
    if (pageSubtitle) pageSubtitle.textContent = "Add and manage rooms under this level.";
  }

  function setupCustomSuggestions() {
    setupSuggestionField({
      input: roomNoInput,
      box: roomNoSuggestions,
      getSuggestions: getRoomNameSuggestions,
      onSelect: (value) => {
        roomNoInput.value = value;
        syncRoomFieldsFromName(true);
      },
    });

    setupSuggestionField({
      input: roomVerificationIdInput,
      box: roomVerificationSuggestions,
      getSuggestions: getRoomVerificationSuggestions,
      onSelect: (value) => {
        roomVerificationIdInput.value = value;
        roomVerificationIdInput.dataset.auto = "false";
        roomPageLinkInput.value = makeRoomHomepageLink(value);
        roomPageLinkInput.dataset.auto = "true";
      },
    });

    setupSuggestionField({
      input: roomPageLinkInput,
      box: roomPageLinkSuggestions,
      getSuggestions: getRoomPageLinkSuggestions,
      onSelect: (value) => {
        roomPageLinkInput.value = value;
        roomPageLinkInput.dataset.auto = "false";
      },
    });
  }

  function setupSuggestionField({ input, box, getSuggestions, onSelect }) {
    if (!input || !box) return;
    input.addEventListener("focus", () => renderSuggestionBox(box, getSuggestions(input.value), onSelect));
    input.addEventListener("input", () => renderSuggestionBox(box, getSuggestions(input.value), onSelect));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideSuggestionBox(box);
    });
  }

  function getRoomNameSuggestions(query = "") {
    const search = query.trim().toLowerCase();
    return roomOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => item.name);
  }

  function getRoomVerificationSuggestions(query = "") {
    const selectedRoom = findRoomByName(roomNoInput.value);
    const search = query.trim().toLowerCase();

    if (selectedRoom) return !search || selectedRoom.slug.includes(search) ? [selectedRoom.slug] : [];

    return roomOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => item.slug);
  }

  function getRoomPageLinkSuggestions(query = "") {
    const selectedRoom = findRoomByName(roomNoInput.value);
    const search = query.trim().toLowerCase();

    if (selectedRoom) {
      const link = makeRoomHomepageLink(selectedRoom.slug);
      return !search || link.toLowerCase().includes(search) ? [link] : [];
    }

    const typedSlug = roomVerificationIdInput.value.trim();
    if (typedSlug) {
      const link = makeRoomHomepageLink(typedSlug);
      return !search || link.toLowerCase().includes(search) ? [link] : [];
    }

    return roomOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => makeRoomHomepageLink(item.slug));
  }

  function syncRoomFieldsFromName(force = false) {
    const selectedRoom = findRoomByName(roomNoInput?.value);
    if (!selectedRoom) return;

    if (force || !roomVerificationIdInput.value.trim() || roomVerificationIdInput.dataset.auto === "true") {
      roomVerificationIdInput.value = selectedRoom.slug;
      roomVerificationIdInput.dataset.auto = "true";
    }

    if (force || !roomPageLinkInput.value.trim() || roomPageLinkInput.dataset.auto === "true") {
      roomPageLinkInput.value = makeRoomHomepageLink(selectedRoom.slug);
      roomPageLinkInput.dataset.auto = "true";
    }
  }

  async function loadRooms() {
    hideAlert();
    if (!roomGrid) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/room_pages/list.php?building_verification_id=${encodeURIComponent(BUILDING_VERIFICATION_ID)}&floor_verification_id=${encodeURIComponent(FLOOR_VERIFICATION_ID)}`,
        { method: "GET", credentials: "include" }
      );
      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to load rooms.");
      renderRooms(result.data?.rooms || []);
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
        <article class="device-card empty-card">
          <div class="device-icon">⚡</div>
          <h3>No room added yet</h3>
          <p>Click “Add Rooms” and connect a room homepage.</p>
        </article>
      `;
      return;
    }

    rooms.forEach((room) => {
      const pageLink = String(room.page_link || "").trim();
      const card = document.createElement("article");
      card.className = "device-card building-card";
      card.innerHTML = `
        <h3>${escapeHtml(room.room_name)}</h3>
        <p class="status-pill online">Active</p>
        <div class="card-actions">
          <a class="primary-btn open-homepage-btn" href="${escapeAttribute(pageLink)}">Open Homepage</a>
          <button type="button" class="secondary-btn remove-building-btn">Remove</button>
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

      removeBtn?.addEventListener("click", () => removeRoom(room.id, room.room_name));
      roomGrid.appendChild(card);
    });
  }

  async function handleCreateRoom(event) {
    event.preventDefault();
    hideAlert();
    hideAllSuggestions();

    const roomName = roomNoInput.value.trim();
    const roomVerificationId = roomVerificationIdInput.value.trim();
    const pageLink = roomPageLinkInput.value.trim();

    if (!roomName) return showInputError("Please enter Room Name / No.", roomNoInput);
    if (!roomVerificationId) return showInputError("Please enter Verification ID.", roomVerificationIdInput);
    if (!/^[a-z0-9_]+$/.test(roomVerificationId)) return showInputError("Verification ID can contain only lowercase letters, numbers, and underscore.", roomVerificationIdInput);
    if (!pageLink) return showInputError("Please enter Homepage Link.", roomPageLinkInput);
    if (pageLink.toLowerCase().startsWith("javascript:") || pageLink.toLowerCase().startsWith("data:")) return showInputError("Invalid Homepage Link.", roomPageLinkInput);

    const expectedPathPart = `/daffodil_smart_city/buildings/${BUILDING_VERIFICATION_ID}/floors/${FLOOR_VERIFICATION_ID}/rooms/${roomVerificationId}/`;
    if (!pageLink.includes(expectedPathPart)) return showInputError(`Homepage Link must contain: ${expectedPathPart}`, roomPageLinkInput);

    try {
      saveRoomBtn.disabled = true;
      saveRoomBtn.textContent = "Saving...";

      const response = await fetch(`${API_BASE_URL}/room_pages/create.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_verification_id: BUILDING_VERIFICATION_ID,
          floor_verification_id: FLOOR_VERIFICATION_ID,
          room_name: roomName,
          room_verification_id: roomVerificationId,
          page_link: pageLink,
        }),
      });

      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to save room.");

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
    if (!window.confirm(`Remove ${roomName}?`)) return;
    hideAlert();
    hideAllSuggestions();

    try {
      const response = await fetch(`${API_BASE_URL}/room_pages/delete.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to remove room.");
      showAlert(result.message || "Room removed successfully.", "success");
      loadRooms();
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Failed to remove room.", "danger");
    }
  }

  function findRoomByName(name) {
    const cleanName = String(name || "").trim().toLowerCase();
    if (!cleanName) return null;
    return roomOptions.find((item) => item.name.toLowerCase() === cleanName) || null;
  }

  function makeRoomHomepageLink(roomSlug) {
    return `${window.location.origin}${PROJECT_ROOT}/daffodil_smart_city/buildings/${BUILDING_VERIFICATION_ID}/floors/${FLOOR_VERIFICATION_ID}/rooms/${roomSlug}/`;
  }

  function renderSuggestionBox(box, suggestions, onSelect) {
    hideAllSuggestionsExcept(box);
    box.innerHTML = "";
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);
    if (!uniqueSuggestions.length) return hideSuggestionBox(box);

    uniqueSuggestions.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "black-suggestion-item";
      button.textContent = suggestion;
      button.addEventListener("mousedown", (event) => event.preventDefault());
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
    if (activeBox !== roomNoSuggestions) hideSuggestionBox(roomNoSuggestions);
    if (activeBox !== roomVerificationSuggestions) hideSuggestionBox(roomVerificationSuggestions);
    if (activeBox !== roomPageLinkSuggestions) hideSuggestionBox(roomPageLinkSuggestions);
  }

  function openModal() {
    hideAlert();
    hideAllSuggestions();
    roomForm?.reset();
    if (roomVerificationIdInput) roomVerificationIdInput.dataset.auto = "true";
    if (roomPageLinkInput) roomPageLinkInput.dataset.auto = "true";
    roomModal?.classList.remove("hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => roomNoInput?.focus(), 50);
  }

  function closeModal() {
    if (!roomModal) return;
    hideAllSuggestions();
    roomModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    roomForm?.reset();
    if (saveRoomBtn) {
      saveRoomBtn.disabled = false;
      saveRoomBtn.textContent = "Save Room";
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
    sidebar?.classList.contains("open") ? closeSidebar() : openSidebar();
  }

  function showInputError(message, input) {
    showAlert(message, "danger");
    input?.focus();
  }

  function showAlert(message, type = "danger") {
    if (!pageAlert) return;
    if (alertTimeoutId) clearTimeout(alertTimeoutId);
    pageAlert.textContent = message;
    pageAlert.className = `alert ${type}`;
    alertTimeoutId = setTimeout(hideAlert, 4500);
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
  if (buildingIndex === -1 || !parts[buildingIndex + 1]) return "unknown_building";
  return parts[buildingIndex + 1];
}

function getFloorSlugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const floorIndex = parts.indexOf("floors");
  if (floorIndex === -1 || !parts[floorIndex + 1]) return "unknown_floor";
  return parts[floorIndex + 1];
}

function isApiSuccess(payload) {
  return payload && (payload.status === true || payload.success === true);
}

function toTitleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
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
