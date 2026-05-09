const CAMPUS_TABLE = "daffodil_smart_city";
const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;

let buildingOptions = [];

document.addEventListener("DOMContentLoaded", async () => {
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

  bindEvents();
  setupCustomSuggestions();

  try {
    await loadBuildingCatalog();
  } catch (error) {
    console.error(error);
    showAlert(error.message || "Could not load building catalog.", "danger");
  }

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

    addBuildingBtn?.addEventListener("click", openModal);
    modalCloseBtn?.addEventListener("click", closeModal);
    modalCancelBtn?.addEventListener("click", closeModal);

    buildingModal?.addEventListener("click", (event) => {
      if (event.target === buildingModal) closeModal();
    });

    buildingForm?.addEventListener("submit", handleCreateBuilding);

    buildingNameInput?.addEventListener("input", () => syncBuildingFieldsFromName(false));

    verificationIdInput?.addEventListener("input", () => {
      verificationIdInput.dataset.auto = "false";
      const slug = verificationIdInput.value.trim();
      if (slug && pageLinkInput && (!pageLinkInput.value.trim() || pageLinkInput.dataset.auto === "true")) {
        pageLinkInput.value = makeBuildingHomepageLink(slug);
        pageLinkInput.dataset.auto = "true";
      }
    });

    pageLinkInput?.addEventListener("input", () => {
      pageLinkInput.dataset.auto = "false";
    });
  }

  async function loadBuildingCatalog() {
    const response = await fetch(
      `${API_BASE_URL}/building_catalog/list.php?campus_table=${encodeURIComponent(CAMPUS_TABLE)}`,
      { method: "GET", credentials: "include" }
    );

    const result = await response.json();
    if (!response.ok || !isApiSuccess(result)) {
      throw new Error(result.message || "Failed to load building catalog.");
    }

    buildingOptions = (result.data?.buildings || []).map((item) => ({
      name: item.name || item.building_name,
      slug: item.slug || item.verification_id || item.building_verification_id,
    })).filter((item) => item.name && item.slug);
  }

  function setupCustomSuggestions() {
    setupSuggestionField({
      input: buildingNameInput,
      box: buildingNameSuggestions,
      getSuggestions: getBuildingNameSuggestions,
      onSelect: (value) => {
        buildingNameInput.value = value;
        syncBuildingFieldsFromName(true);
      },
    });

    setupSuggestionField({
      input: verificationIdInput,
      box: verificationSuggestions,
      getSuggestions: getVerificationSuggestions,
      onSelect: (value) => {
        verificationIdInput.value = value;
        verificationIdInput.dataset.auto = "false";
        pageLinkInput.value = makeBuildingHomepageLink(value);
        pageLinkInput.dataset.auto = "true";
      },
    });

    setupSuggestionField({
      input: pageLinkInput,
      box: pageLinkSuggestions,
      getSuggestions: getPageLinkSuggestions,
      onSelect: (value) => {
        pageLinkInput.value = value;
        pageLinkInput.dataset.auto = "false";
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

  function getBuildingNameSuggestions(query = "") {
    const search = query.trim().toLowerCase();
    return buildingOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => item.name);
  }

  function getVerificationSuggestions(query = "") {
    const selectedBuilding = findBuildingByName(buildingNameInput.value);
    const search = query.trim().toLowerCase();

    if (selectedBuilding) {
      return !search || selectedBuilding.slug.includes(search) ? [selectedBuilding.slug] : [];
    }

    return buildingOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => item.slug);
  }

  function getPageLinkSuggestions(query = "") {
    const selectedBuilding = findBuildingByName(buildingNameInput.value);
    const search = query.trim().toLowerCase();

    if (selectedBuilding) {
      const link = makeBuildingHomepageLink(selectedBuilding.slug);
      return !search || link.toLowerCase().includes(search) ? [link] : [];
    }

    const typedSlug = verificationIdInput.value.trim();
    if (typedSlug) {
      const link = makeBuildingHomepageLink(typedSlug);
      return !search || link.toLowerCase().includes(search) ? [link] : [];
    }

    return buildingOptions
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.slug.toLowerCase().includes(search))
      .map((item) => makeBuildingHomepageLink(item.slug));
  }

  function syncBuildingFieldsFromName(force = false) {
    const selected = findBuildingByName(buildingNameInput?.value);
    if (!selected) return;

    if (force || !verificationIdInput.value.trim() || verificationIdInput.dataset.auto === "true") {
      verificationIdInput.value = selected.slug;
      verificationIdInput.dataset.auto = "true";
    }

    if (force || !pageLinkInput.value.trim() || pageLinkInput.dataset.auto === "true") {
      pageLinkInput.value = makeBuildingHomepageLink(selected.slug);
      pageLinkInput.dataset.auto = "true";
    }
  }

  async function loadBuildings() {
    hideAlert();
    if (!buildingGrid) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/building_pages/list.php?campus_table=${encodeURIComponent(CAMPUS_TABLE)}`,
        { method: "GET", credentials: "include" }
      );

      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) {
        throw new Error(result.message || "Failed to load buildings.");
      }

      renderBuildings(result.data?.buildings || []);
    } catch (error) {
      console.error(error);
      renderBuildings([]);
      showAlert("Could not load buildings. Check electricity_api/building_pages/list.php.", "danger");
    }
  }

  function renderBuildings(buildings) {
    buildingGrid.innerHTML = "";

    if (!buildings.length) {
      buildingGrid.innerHTML = `
        <article class="device-card empty-card">
          <div class="device-icon">⚡</div>
          <h3>No building added yet</h3>
          <p>Click “Add Buildings” and connect a building homepage.</p>
        </article>
      `;
      return;
    }

    buildings.forEach((building) => {
      const pageLink = String(building.page_link || "").trim();
      const card = document.createElement("article");
      card.className = "device-card building-card";
      card.innerHTML = `
        <h3>${escapeHtml(building.building_name)}</h3>
        <div class="building-card-actions">
          <a class="open-homepage-btn" href="${escapeAttribute(pageLink)}">Open Building</a>
          <button type="button" class="remove-building-btn">Remove</button>
        </div>
      `;

      const openBtn = card.querySelector(".open-homepage-btn");
      const removeBtn = card.querySelector(".remove-building-btn");

      if (!pageLink && openBtn) {
        openBtn.addEventListener("click", (event) => {
          event.preventDefault();
          showAlert("Homepage link not found for this building.", "danger");
        });
      }

      removeBtn?.addEventListener("click", () => removeBuilding(building.id, building.building_name));
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

    if (!buildingName) return showInputError("Please enter Building Name.", buildingNameInput);
    if (!verificationId) return showInputError("Please enter Verification ID.", verificationIdInput);
    if (!/^[a-z0-9_]+$/.test(verificationId)) return showInputError("Verification ID can contain only lowercase letters, numbers, and underscore.", verificationIdInput);
    if (!pageLink) return showInputError("Please enter Homepage Link.", pageLinkInput);
    if (pageLink.toLowerCase().startsWith("javascript:") || pageLink.toLowerCase().startsWith("data:")) return showInputError("Invalid Homepage Link.", pageLinkInput);

    const expectedPathPart = `/daffodil_smart_city/buildings/${verificationId}/`;
    if (!pageLink.includes(expectedPathPart)) {
      return showInputError(`Homepage Link must contain: ${expectedPathPart}`, pageLinkInput);
    }

    try {
      saveBuildingBtn.disabled = true;
      saveBuildingBtn.textContent = "Saving...";

      const response = await fetch(`${API_BASE_URL}/building_pages/create.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campus_table: CAMPUS_TABLE,
          building_name: buildingName,
          verification_id: verificationId,
          page_link: pageLink,
        }),
      });

      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) {
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
    if (!window.confirm(`Remove ${buildingName}?`)) return;

    hideAlert();
    hideAllSuggestions();

    try {
      const response = await fetch(`${API_BASE_URL}/building_pages/delete.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();
      if (!response.ok || !isApiSuccess(result)) {
        throw new Error(result.message || "Failed to remove building.");
      }

      showAlert(result.message || "Building removed successfully.", "success");
      loadBuildings();
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Failed to remove building.", "danger");
    }
  }

  function findBuildingByName(name) {
    const cleanName = String(name || "").trim().toLowerCase();
    if (!cleanName) return null;
    return buildingOptions.find((item) => item.name.toLowerCase() === cleanName) || null;
  }

  function makeBuildingHomepageLink(slug) {
    return `${window.location.origin}${PROJECT_ROOT}/daffodil_smart_city/buildings/${slug}/`;
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
    hideSuggestionBox(buildingNameSuggestions);
    hideSuggestionBox(verificationSuggestions);
    hideSuggestionBox(pageLinkSuggestions);
  }

  function hideAllSuggestionsExcept(activeBox) {
    if (activeBox !== buildingNameSuggestions) hideSuggestionBox(buildingNameSuggestions);
    if (activeBox !== verificationSuggestions) hideSuggestionBox(verificationSuggestions);
    if (activeBox !== pageLinkSuggestions) hideSuggestionBox(pageLinkSuggestions);
  }

  function openModal() {
    hideAlert();
    hideAllSuggestions();
    buildingForm?.reset();
    if (verificationIdInput) verificationIdInput.dataset.auto = "true";
    if (pageLinkInput) pageLinkInput.dataset.auto = "true";
    buildingModal?.classList.remove("hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => buildingNameInput?.focus(), 50);
  }

  function closeModal() {
    if (!buildingModal) return;
    hideAllSuggestions();
    buildingModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    buildingForm?.reset();
    if (saveBuildingBtn) {
      saveBuildingBtn.disabled = false;
      saveBuildingBtn.textContent = "Save Building";
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

function isApiSuccess(payload) {
  return payload && (payload.status === true || payload.success === true);
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
