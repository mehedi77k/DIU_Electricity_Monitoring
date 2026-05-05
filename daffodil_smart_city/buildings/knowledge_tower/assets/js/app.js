const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;
const BUILDING_VERIFICATION_ID = getBuildingSlugFromUrl();

document.addEventListener("DOMContentLoaded", () => {
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

  const levelOptions = [
    { name: "Basement", slug: "basement" },
    { name: "Ground Floor", slug: "ground_floor" },
    { name: "Level 1", slug: "level_1" },
    { name: "Level 2", slug: "level_2" },
    { name: "Level 3", slug: "level_3" },
    { name: "Level 4", slug: "level_4" },
    { name: "Level 5", slug: "level_5" },
    { name: "Level 6", slug: "level_6" },
    { name: "Level 7", slug: "level_7" },
    { name: "Level 8", slug: "level_8" },
    { name: "Level 9", slug: "level_9" },
    { name: "Level 10", slug: "level_10" },
    { name: "Level 11", slug: "level_11" },
    { name: "Level 12", slug: "level_12" },
    { name: "Rooftop", slug: "rooftop" }
  ];

  setBuildingTitle();
  bindEvents();
  setupCustomSuggestions();
  loadLevels();

  function setBuildingTitle() {
    const readableName = buildingNameMap[BUILDING_VERIFICATION_ID] || toTitleCase(BUILDING_VERIFICATION_ID);

    document.title = `${readableName} | Daffodil Smart City`;

    if (buildingTitle) {
      buildingTitle.textContent = readableName;
    }
  }

  function bindEvents() {
    if (burgerBtn && sidebar && sidebarOverlay) {
      burgerBtn.addEventListener("click", toggleSidebar);
      sidebarOverlay.addEventListener("click", closeSidebar);
    }

    if (addLevelBtn) {
      addLevelBtn.addEventListener("click", openModal);
    }

    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", closeModal);
    }

    if (modalCancelBtn) {
      modalCancelBtn.addEventListener("click", closeModal);
    }

    if (levelModal) {
      levelModal.addEventListener("click", (event) => {
        if (event.target === levelModal) {
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

    if (levelForm) {
      levelForm.addEventListener("submit", handleCreateLevel);
    }

    if (levelNameInput) {
      levelNameInput.addEventListener("input", () => {
        syncLevelFieldsFromName(false);
      });
    }

    if (levelVerificationIdInput) {
      levelVerificationIdInput.addEventListener("input", () => {
        levelVerificationIdInput.dataset.auto = "false";

        const verificationId = levelVerificationIdInput.value.trim();

        if (
          verificationId &&
          levelPageLinkInput &&
          (!levelPageLinkInput.value.trim() || levelPageLinkInput.dataset.auto === "true")
        ) {
          levelPageLinkInput.value = makeLevelHomepageLink(verificationId);
          levelPageLinkInput.dataset.auto = "true";
        }
      });
    }

    if (levelPageLinkInput) {
      levelPageLinkInput.addEventListener("input", () => {
        levelPageLinkInput.dataset.auto = "false";
      });
    }
  }

  function setupCustomSuggestions() {
    setupSuggestionField({
      input: levelNameInput,
      box: levelNameSuggestions,
      getSuggestions: getLevelNameSuggestions,
      onSelect: (value) => {
        levelNameInput.value = value;
        syncLevelFieldsFromName(true);
      }
    });

    setupSuggestionField({
      input: levelVerificationIdInput,
      box: levelVerificationSuggestions,
      getSuggestions: getLevelVerificationSuggestions,
      onSelect: (value) => {
        levelVerificationIdInput.value = value;
        levelVerificationIdInput.dataset.auto = "false";

        if (!levelPageLinkInput.value.trim() || levelPageLinkInput.dataset.auto === "true") {
          levelPageLinkInput.value = makeLevelHomepageLink(value);
          levelPageLinkInput.dataset.auto = "true";
        }
      }
    });

    setupSuggestionField({
      input: levelPageLinkInput,
      box: levelPageLinkSuggestions,
      getSuggestions: getLevelPageLinkSuggestions,
      onSelect: (value) => {
        levelPageLinkInput.value = value;
        levelPageLinkInput.dataset.auto = "false";
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

  function getLevelNameSuggestions(query = "") {
    const search = query.trim().toLowerCase();

    if (!search) {
      return levelOptions.map((item) => item.name);
    }

    return levelOptions
      .filter((item) => {
        return (
          item.name.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search)
        );
      })
      .map((item) => item.name);
  }

  function getLevelVerificationSuggestions(query = "") {
    const selectedLevel = findLevelByName(levelNameInput.value);
    const search = query.trim().toLowerCase();

    if (selectedLevel) {
      if (!search || selectedLevel.slug.includes(search)) {
        return [selectedLevel.slug];
      }

      return [];
    }

    const typedLevelSlug = slugifyLevel(levelNameInput.value);

    if (typedLevelSlug) {
      if (!search || typedLevelSlug.includes(search)) {
        return [typedLevelSlug];
      }
    }

    if (!search) {
      return levelOptions.map((item) => item.slug);
    }

    return levelOptions
      .filter((item) => {
        return (
          item.name.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search)
        );
      })
      .map((item) => item.slug);
  }

  function getLevelPageLinkSuggestions(query = "") {
    const selectedLevel = findLevelByName(levelNameInput.value);
    const search = query.trim().toLowerCase();

    if (selectedLevel) {
      const link = makeLevelHomepageLink(selectedLevel.slug);

      if (!search || link.toLowerCase().includes(search)) {
        return [link];
      }

      return [];
    }

    const typedVerificationId = levelVerificationIdInput.value.trim();
    const typedLevelSlug = typedVerificationId || slugifyLevel(levelNameInput.value);

    if (typedLevelSlug) {
      const link = makeLevelHomepageLink(typedLevelSlug);

      if (!search || link.toLowerCase().includes(search)) {
        return [link];
      }
    }

    if (!search) {
      return levelOptions.map((item) => makeLevelHomepageLink(item.slug));
    }

    return levelOptions
      .filter((item) => {
        const link = makeLevelHomepageLink(item.slug).toLowerCase();

        return (
          item.name.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search) ||
          link.includes(search)
        );
      })
      .map((item) => makeLevelHomepageLink(item.slug));
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
    hideSuggestionBox(levelNameSuggestions);
    hideSuggestionBox(levelVerificationSuggestions);
    hideSuggestionBox(levelPageLinkSuggestions);
  }

  function syncLevelFieldsFromName(force = false) {
    if (!levelNameInput || !levelVerificationIdInput || !levelPageLinkInput) return;

    const levelName = levelNameInput.value.trim();
    const selectedLevel = findLevelByName(levelName);
    const levelSlug = selectedLevel ? selectedLevel.slug : slugifyLevel(levelName);

    if (!levelSlug) return;

    if (
      force ||
      !levelVerificationIdInput.value.trim() ||
      levelVerificationIdInput.dataset.auto === "true"
    ) {
      levelVerificationIdInput.value = levelSlug;
      levelVerificationIdInput.dataset.auto = "true";
    }

    if (
      force ||
      !levelPageLinkInput.value.trim() ||
      levelPageLinkInput.dataset.auto === "true"
    ) {
      levelPageLinkInput.value = makeLevelHomepageLink(levelSlug);
      levelPageLinkInput.dataset.auto = "true";
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

    if (!levelModal) return;

    if (levelForm) {
      levelForm.reset();
    }

    if (levelVerificationIdInput) {
      levelVerificationIdInput.dataset.auto = "true";
    }

    if (levelPageLinkInput) {
      levelPageLinkInput.dataset.auto = "true";
    }

    levelModal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    setTimeout(() => {
      levelNameInput?.focus();
    }, 50);
  }

  function closeModal() {
    if (!levelModal) return;

    hideAllSuggestions();

    levelModal.classList.add("hidden");
    document.body.classList.remove("modal-open");

    if (levelForm) {
      levelForm.reset();
    }

    if (saveLevelBtn) {
      saveLevelBtn.disabled = false;
      saveLevelBtn.textContent = "Save Level";
    }
  }

  async function loadLevels() {
    hideAlert();

    if (!levelGrid) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/floor_pages/list.php?building_verification_id=${encodeURIComponent(BUILDING_VERIFICATION_ID)}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to load levels.");
      }

      const levels = result.data.floors || [];
      renderLevels(levels);
    } catch (error) {
      console.error(error);
      renderLevels([]);
      showAlert("Could not load levels. Make sure electricity_api/floor_pages/list.php exists.", "danger");
    }
  }

  function renderLevels(levels) {
    levelGrid.innerHTML = "";

    if (!levels.length) {
      levelGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚡</div>
          <h3>No floor added yet</h3>
          <p>Click “Add Levels” and connect a level homepage.</p>
        </div>
      `;

      return;
    }

    levels.forEach((level) => {
      const pageLink = String(level.page_link || "").trim();

      const card = document.createElement("article");
      card.className = "device-card building-card";

      card.innerHTML = `
        <div class="device-card-head">
          <div>
            <h3>${escapeHtml(level.floor_name)}</h3>
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
            data-id="${escapeAttribute(level.id)}"
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
          showAlert("Homepage link not found for this level.", "danger");
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          removeLevel(level.id, level.floor_name);
        });
      }

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

    if (!levelName) {
      showAlert("Please enter Level Name.", "danger");
      levelNameInput.focus();
      return;
    }

    if (!levelVerificationId) {
      showAlert("Please enter Verification ID manually or select suggestion.", "danger");
      levelVerificationIdInput.focus();
      return;
    }

    if (!/^[a-z0-9_]+$/.test(levelVerificationId)) {
      showAlert("Verification ID can contain only lowercase letters, numbers, and underscore.", "danger");
      levelVerificationIdInput.focus();
      return;
    }

    if (!pageLink) {
      showAlert("Please enter Homepage Link manually or select suggestion.", "danger");
      levelPageLinkInput.focus();
      return;
    }

    if (
      pageLink.toLowerCase().startsWith("javascript:") ||
      pageLink.toLowerCase().startsWith("data:")
    ) {
      showAlert("Invalid Homepage Link.", "danger");
      levelPageLinkInput.focus();
      return;
    }

    const expectedPathPart = `/daffodil_smart_city/buildings/${BUILDING_VERIFICATION_ID}/floors/${levelVerificationId}/`;

    if (!pageLink.includes(expectedPathPart)) {
      showAlert(`Homepage Link must contain: ${expectedPathPart}`, "danger");
      levelPageLinkInput.focus();
      return;
    }

    try {
      saveLevelBtn.disabled = true;
      saveLevelBtn.textContent = "Saving...";

      const response = await fetch(`${API_BASE_URL}/floor_pages/create.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          building_verification_id: BUILDING_VERIFICATION_ID,
          floor_name: levelName,
          floor_verification_id: levelVerificationId,
          page_link: pageLink
        })
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to save level.");
      }

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
    const confirmed = window.confirm(`Remove ${levelName}?`);

    if (!confirmed) return;

    hideAlert();
    hideAllSuggestions();

    try {
      const response = await fetch(`${API_BASE_URL}/floor_pages/delete.php`, {
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
        throw new Error(result.message || "Failed to remove level.");
      }

      showAlert(result.message || "Level removed successfully.", "success");
      loadLevels();
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Failed to remove level.", "danger");
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
});

function getBuildingSlugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const buildingIndex = parts.indexOf("buildings");

  if (buildingIndex === -1 || !parts[buildingIndex + 1]) {
    return "unknown_building";
  }

  return parts[buildingIndex + 1];
}

function slugifyLevel(value) {
  const cleanValue = String(value || "").trim().toLowerCase();

  if (!cleanValue) {
    return "";
  }

  let slug = cleanValue
    .replace(/^level\s*/i, "level_")
    .replace(/^floor\s*/i, "floor_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  slug = slug.replace(/_+/g, "_");

  if (/^[0-9]+$/.test(slug)) {
    slug = `level_${slug}`;
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