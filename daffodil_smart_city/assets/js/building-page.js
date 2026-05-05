const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;
const CAMPUS_TABLE = "daffodil_smart_city";
const BUILDING_VERIFICATION_ID = getBuildingSlugFromUrl();

let levelOptions = [];
let buildingDisplayName = toTitleCase(BUILDING_VERIFICATION_ID);

document.addEventListener("DOMContentLoaded", async () => {
  const burgerBtn = document.getElementById("burgerBtn");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const buildingTitle = document.getElementById("buildingTitle");
  const pageAlert = document.getElementById("pageAlert");
  const addLevelBtn = document.getElementById("addLevelBtn");
  const levelModal = document.getElementById("levelModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  const levelForm = document.getElementById("levelForm");
  const levelGrid = document.getElementById("levelGrid");
  const levelNameInput = document.getElementById("levelName");
  const levelVerificationIdInput = document.getElementById("levelVerificationId");
  const levelPageLinkInput = document.getElementById("levelPageLink");
  const levelNameSuggestions = document.getElementById("levelNameSuggestions");
  const levelVerificationSuggestions = document.getElementById("levelVerificationSuggestions");
  const levelPageLinkSuggestions = document.getElementById("levelPageLinkSuggestions");
  const saveLevelBtn = document.getElementById("saveLevelBtn");

  let alertTimeoutId = null;

  bindEvents();
  setupCustomSuggestions();
  setBuildingTitle();

  const catalogResults = await Promise.allSettled([loadBuildingName(), loadLevelCatalog()]);
  catalogResults.forEach((result) => {
    if (result.status === "rejected") console.error(result.reason);
  });

  setBuildingTitle();
  loadLevels();

  function bindEvents() {
    if (burgerBtn && sidebar && sidebarOverlay) {
      burgerBtn.addEventListener("click", toggleSidebar);
      sidebarOverlay.addEventListener("click", closeSidebar);
    }

    addLevelBtn?.addEventListener("click", openModal);
    modalCloseBtn?.addEventListener("click", closeModal);
    modalCancelBtn?.addEventListener("click", closeModal);

    levelModal?.addEventListener("click", (event) => {
      if (event.target === levelModal) closeModal();
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

    levelForm?.addEventListener("submit", handleCreateLevel);

    levelNameInput?.addEventListener("input", () => syncLevelFieldsFromName(false));

    levelVerificationIdInput?.addEventListener("input", () => {
      levelVerificationIdInput.dataset.auto = "false";
      const verificationId = levelVerificationIdInput.value.trim();
      if (verificationId && (!levelPageLinkInput.value.trim() || levelPageLinkInput.dataset.auto === "true")) {
        levelPageLinkInput.value = makeLevelHomepageLink(verificationId);
        levelPageLinkInput.dataset.auto = "true";
      }
    });

    levelPageLinkInput?.addEventListener("input", () => {
      levelPageLinkInput.dataset.auto = "false";
    });
  }

  async function loadBuildingName() {
    const response = await fetch(`${API_BASE_URL}/building_catalog/list.php?campus_table=${encodeURIComponent(CAMPUS_TABLE)}`, {
      method: "GET",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to load building catalog.");

    const match = (result.data?.buildings || []).find((item) => {
      const slug = item.slug || item.verification_id || item.building_verification_id;
      return slug === BUILDING_VERIFICATION_ID;
    });

    if (match) buildingDisplayName = match.name || match.building_name || buildingDisplayName;
  }

  async function loadLevelCatalog() {
    const response = await fetch(`${API_BASE_URL}/level_catalog/list.php?building_verification_id=${encodeURIComponent(BUILDING_VERIFICATION_ID)}`, {
      method: "GET",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to load level catalog.");

    levelOptions = (result.data?.levels || []).map((item) => ({
      name: item.name || item.level_name,
      slug: item.slug || item.level_verification_id,
    })).filter((item) => item.name && item.slug);
  }

  function setBuildingTitle() {
    document.title = `${buildingDisplayName} | Daffodil Smart City`;
    if (buildingTitle) buildingTitle.textContent = buildingDisplayName;
  }

  function setupCustomSuggestions() {
    setupSuggestionField({
      input: levelNameInput,
      box: levelNameSuggestions,
      getSuggestions: getLevelNameSuggestions,
      onSelect: (value) => {
        levelNameInput.value = value;
        syncLevelFieldsFromName(true);
      },
    });

    setupSuggestionField({
      input: levelVerificationIdInput,
      box: levelVerificationSuggestions,
      getSuggestions: getLevelVerificationSuggestions,
      onSelect: (value) => {
        levelVerificationIdInput.value = value;
        levelVerificationIdInput.dataset.auto = "false";
        levelPageLinkInput.value = makeLevelHomepageLink(value);
        levelPageLinkInput.dataset.auto = "true";
      },
    });

    setupSuggestionField({
      input: levelPageLinkInput,
      box: levelPageLinkSuggestions,
      getSuggestions: getLevelPageLinkSuggestions,
      onSelect: (value) => {
        levelPageLinkInput.value = value;
        levelPageLinkInput.dataset.auto = "false";
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

  function getLevelNameSuggestions(query = "") {
    const search = query.trim().toLowerCase();
    return levelOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => item.name);
  }

  function getLevelVerificationSuggestions(query = "") {
    const selectedLevel = findLevelByName(levelNameInput.value);
    const search = query.trim().toLowerCase();

    if (selectedLevel) return !search || selectedLevel.slug.includes(search) ? [selectedLevel.slug] : [];

    return levelOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => item.slug);
  }

  function getLevelPageLinkSuggestions(query = "") {
    const selectedLevel = findLevelByName(levelNameInput.value);
    const search = query.trim().toLowerCase();

    if (selectedLevel) {
      const link = makeLevelHomepageLink(selectedLevel.slug);
      return !search || link.toLowerCase().includes(search) ? [link] : [];
    }

    const typedSlug = levelVerificationIdInput.value.trim();
    if (typedSlug) {
      const link = makeLevelHomepageLink(typedSlug);
      return !search || link.toLowerCase().includes(search) ? [link] : [];
    }

    return levelOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => makeLevelHomepageLink(item.slug));
  }

  function syncLevelFieldsFromName(force = false) {
    const selectedLevel = findLevelByName(levelNameInput?.value);
    if (!selectedLevel) return;

    if (force || !levelVerificationIdInput.value.trim() || levelVerificationIdInput.dataset.auto === "true") {
      levelVerificationIdInput.value = selectedLevel.slug;
      levelVerificationIdInput.dataset.auto = "true";
    }

    if (force || !levelPageLinkInput.value.trim() || levelPageLinkInput.dataset.auto === "true") {
      levelPageLinkInput.value = makeLevelHomepageLink(selectedLevel.slug);
      levelPageLinkInput.dataset.auto = "true";
    }
  }

  async function loadLevels() {
    hideAlert();
    if (!levelGrid) return;

    try {
      const response = await fetch(`${API_BASE_URL}/floor_pages/list.php?building_verification_id=${encodeURIComponent(BUILDING_VERIFICATION_ID)}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to load levels.");
      renderLevels(result.data?.floors || []);
    } catch (error) {
      console.error(error);
      renderLevels([]);
      showAlert("Could not load levels. Check electricity_api/floor_pages/list.php.", "danger");
    }
  }

  function renderLevels(levels) {
    levelGrid.innerHTML = "";

    if (!levels.length) {
      levelGrid.innerHTML = `
        <article class="device-card empty-card">
          <div class="device-icon">⚡</div>
          <h3>No level added yet</h3>
          <p>Click “Add Levels” and connect a level homepage.</p>
        </article>
      `;
      return;
    }

    levels.forEach((level) => {
      const pageLink = String(level.page_link || "").trim();
      const card = document.createElement("article");
      card.className = "device-card building-card";
      card.innerHTML = `
        <h3>${escapeHtml(level.floor_name)}</h3>
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
          showAlert("Homepage link not found for this level.", "danger");
        });
      }

      removeBtn?.addEventListener("click", () => removeLevel(level.id, level.floor_name));
      levelGrid.appendChild(card);
    });
  }

  async function handleCreateLevel(event) {
    event.preventDefault();
    hideAlert();
    hideAllSuggestions();

    const levelName = levelNameInput.value.trim();
    const levelVerificationId = levelVerificationIdInput.value.trim();
    const pageLink = levelPageLinkInput.value.trim();

    if (!levelName) return showInputError("Please enter Level Name.", levelNameInput);
    if (!levelVerificationId) return showInputError("Please enter Verification ID.", levelVerificationIdInput);
    if (!/^[a-z0-9_]+$/.test(levelVerificationId)) return showInputError("Verification ID can contain only lowercase letters, numbers, and underscore.", levelVerificationIdInput);
    if (!pageLink) return showInputError("Please enter Homepage Link.", levelPageLinkInput);
    if (pageLink.toLowerCase().startsWith("javascript:") || pageLink.toLowerCase().startsWith("data:")) return showInputError("Invalid Homepage Link.", levelPageLinkInput);

    const expectedPathPart = `/daffodil_smart_city/buildings/${BUILDING_VERIFICATION_ID}/floors/${levelVerificationId}/`;
    if (!pageLink.includes(expectedPathPart)) return showInputError(`Homepage Link must contain: ${expectedPathPart}`, levelPageLinkInput);

    try {
      saveLevelBtn.disabled = true;
      saveLevelBtn.textContent = "Saving...";

      const response = await fetch(`${API_BASE_URL}/floor_pages/create.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_verification_id: BUILDING_VERIFICATION_ID,
          floor_name: levelName,
          floor_verification_id: levelVerificationId,
          page_link: pageLink,
        }),
      });

      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to save level.");

      closeModal();
      showAlert(result.message || "Level connected successfully.", "success");
      loadLevels();
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Failed to save level.", "danger");
    } finally {
      saveLevelBtn.disabled = false;
      saveLevelBtn.textContent = "Save Level";
    }
  }

  async function removeLevel(id, levelName) {
    if (!window.confirm(`Remove ${levelName}?`)) return;
    hideAlert();
    hideAllSuggestions();

    try {
      const response = await fetch(`${API_BASE_URL}/floor_pages/delete.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) throw new Error(result.message || "Failed to remove level.");
      showAlert(result.message || "Level removed successfully.", "success");
      loadLevels();
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Failed to remove level.", "danger");
    }
  }

  function findLevelByName(name) {
    const cleanName = String(name || "").trim().toLowerCase();
    if (!cleanName) return null;
    return levelOptions.find((item) => item.name.toLowerCase() === cleanName) || null;
  }

  function makeLevelHomepageLink(levelSlug) {
    return `${window.location.origin}${PROJECT_ROOT}/daffodil_smart_city/buildings/${BUILDING_VERIFICATION_ID}/floors/${levelSlug}/`;
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
    hideSuggestionBox(levelNameSuggestions);
    hideSuggestionBox(levelVerificationSuggestions);
    hideSuggestionBox(levelPageLinkSuggestions);
  }

  function hideAllSuggestionsExcept(activeBox) {
    if (activeBox !== levelNameSuggestions) hideSuggestionBox(levelNameSuggestions);
    if (activeBox !== levelVerificationSuggestions) hideSuggestionBox(levelVerificationSuggestions);
    if (activeBox !== levelPageLinkSuggestions) hideSuggestionBox(levelPageLinkSuggestions);
  }

  function openModal() {
    hideAlert();
    hideAllSuggestions();
    levelForm?.reset();
    if (levelVerificationIdInput) levelVerificationIdInput.dataset.auto = "true";
    if (levelPageLinkInput) levelPageLinkInput.dataset.auto = "true";
    levelModal?.classList.remove("hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => levelNameInput?.focus(), 50);
  }

  function closeModal() {
    if (!levelModal) return;
    hideAllSuggestions();
    levelModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    levelForm?.reset();
    if (saveLevelBtn) {
      saveLevelBtn.disabled = false;
      saveLevelBtn.textContent = "Save Level";
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
