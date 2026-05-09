(() => {
  const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
  const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;

  const TYPES = {
    building: {
      childType: "level",
      managerTitle: "Building Manager",
      pageKicker: "Campus Home",
      defaultTitle: "Daffodil Smart City",
      description: "Manage buildings, building homepages, and electricity readings.",
      addButton: "+ Add Buildings",
      panelKicker: "Building Cards",
      panelTitle: "Added Buildings",
      modalKicker: "Connect Building",
      modalTitle: "Add Building Homepage",
      nameLabel: "Building Name",
      slugLabel: "Verification ID",
      linkLabel: "Homepage Link",
      saveLabel: "Save Building",
      emptyTitle: "No building added yet",
      emptyText: "Click “Add Buildings” and connect a building homepage.",
      openLabel: "Open Building",
      catalogKey: "buildings",
      activeKey: "buildings",
      catalogUrl: (ctx) =>
        `${ctx.apiBase}/building_catalog/list.php?campus_table=${encodeURIComponent(ctx.campusTable)}`,
      activeUrl: (ctx) =>
        `${ctx.apiBase}/building_pages/list.php?campus_table=${encodeURIComponent(ctx.campusTable)}`,
      createUrl: (ctx) => `${ctx.apiBase}/building_pages/create.php`,
      deleteUrl: (ctx) => `${ctx.apiBase}/building_pages/delete.php`,
      makeLink: (slug, ctx) =>
        `${ctx.origin}${ctx.projectRoot}/daffodil_smart_city/buildings/${slug}/`,
      payload: (form, ctx) => ({
        campus_table: ctx.campusTable,
        building_name: form.name,
        verification_id: form.slug,
        page_link: form.link,
      }),
      normalizeCatalog: (item, ctx) => ({
        id: item.id,
        name: item.name || item.building_name,
        slug: item.slug || item.verification_id || item.building_verification_id,
        link: "",
      }),
      normalizeActive: (item) => ({
        id: item.id,
        name: item.building_name || item.name,
        slug: item.verification_id || item.slug || item.verification_table,
        link: item.page_link,
      }),
    },

    level: {
      childType: "room",
      managerTitle: "Level Manager",
      pageKicker: "Building Home",
      defaultTitle: "Loading Building...",
      description: "Add and manage levels under this building.",
      addButton: "+ Add Levels",
      panelKicker: "Level Cards",
      panelTitle: "Added Levels",
      modalKicker: "Connect Level",
      modalTitle: "Add Level Homepage",
      nameLabel: "Level Name",
      slugLabel: "Verification ID",
      linkLabel: "Homepage Link",
      saveLabel: "Save Level",
      emptyTitle: "No level added yet",
      emptyText: "Click “Add Levels” and connect a level homepage.",
      openLabel: "Open Level",
      catalogKey: "levels",
      activeKey: "floors",
      catalogUrl: (ctx) =>
        `${ctx.apiBase}/level_catalog/list.php?building_verification_id=${encodeURIComponent(ctx.buildingId)}`,
      activeUrl: (ctx) =>
        `${ctx.apiBase}/floor_pages/list.php?building_verification_id=${encodeURIComponent(ctx.buildingId)}`,
      createUrl: (ctx) => `${ctx.apiBase}/floor_pages/create.php`,
      deleteUrl: (ctx) => `${ctx.apiBase}/floor_pages/delete.php`,
      makeLink: (slug, ctx) =>
        `${ctx.origin}${ctx.projectRoot}/daffodil_smart_city/buildings/${ctx.buildingId}/floors/${slug}/`,
      payload: (form, ctx) => ({
        building_verification_id: ctx.buildingId,
        floor_name: form.name,
        floor_verification_id: form.slug,
        page_link: form.link,
      }),
      normalizeCatalog: (item) => ({
        id: item.id,
        name: item.name || item.level_name,
        slug: item.slug || item.level_verification_id,
        link: "",
      }),
      normalizeActive: (item) => ({
        id: item.id,
        name: item.floor_name || item.level_name || item.name,
        slug: item.floor_verification_id || item.level_verification_id || item.slug,
        link: item.page_link,
      }),
    },

    room: {
      childType: "device",
      managerTitle: "Room Manager",
      pageKicker: "Level Home",
      defaultTitle: "Loading Level...",
      description: "Add and manage rooms under this level.",
      addButton: "+ Add Rooms",
      panelKicker: "Room Cards",
      panelTitle: "Added Rooms",
      modalKicker: "Connect Room",
      modalTitle: "Add Room Homepage",
      nameLabel: "Room Name",
      slugLabel: "Verification ID",
      linkLabel: "Homepage Link",
      saveLabel: "Save Room",
      emptyTitle: "No room added yet",
      emptyText: "Click “Add Rooms” and connect a room homepage.",
      openLabel: "Open Room",
      catalogKey: "rooms",
      activeKey: "rooms",
      catalogUrl: (ctx) =>
        `${ctx.apiBase}/room_catalog/list.php?building_verification_id=${encodeURIComponent(ctx.buildingId)}&level_verification_id=${encodeURIComponent(ctx.floorId)}`,
      activeUrl: (ctx) =>
        `${ctx.apiBase}/room_pages/list.php?building_verification_id=${encodeURIComponent(ctx.buildingId)}&floor_verification_id=${encodeURIComponent(ctx.floorId)}`,
      createUrl: (ctx) => `${ctx.apiBase}/room_pages/create.php`,
      deleteUrl: (ctx) => `${ctx.apiBase}/room_pages/delete.php`,
      makeLink: (slug, ctx) =>
        `${ctx.origin}${ctx.projectRoot}/daffodil_smart_city/buildings/${ctx.buildingId}/floors/${ctx.floorId}/rooms/${slug}/`,
      payload: (form, ctx) => ({
        building_verification_id: ctx.buildingId,
        floor_verification_id: ctx.floorId,
        room_name: form.name,
        room_verification_id: form.slug,
        page_link: form.link,
      }),
      normalizeCatalog: (item) => ({
        id: item.id,
        name: item.name || item.room_name || item.roomNo,
        slug: item.slug || item.room_verification_id,
        link: "",
      }),
      normalizeActive: (item) => ({
        id: item.id,
        name: item.room_name || item.name,
        slug: item.room_verification_id || item.slug,
        link: item.page_link,
      }),
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("diuEntityApp");
    if (!root) return;

    const type = root.dataset.entity;
    const config = TYPES[type];

    if (!config) {
      root.innerHTML = `<p class="alert danger">Invalid entity type: ${escapeHtml(type)}</p>`;
      return;
    }

    const ctx = getContext(root);
    const state = {
      catalog: [],
      active: [],
      selected: null,
      alertTimer: null,
      pageTitle: config.defaultTitle,
    };

    renderShell(root, config, ctx, state);
    bindEvents(root, config, ctx, state);
    init(root, config, ctx, state);
  });

  async function init(root, config, ctx, state) {
    try {
      await loadParentTitle(config, ctx, state);
      updateHeader(root, config, state);

      state.catalog = await loadCatalog(config, ctx);
      state.active = await loadActive(config, ctx);

      renderCards(root, config, ctx, state);
    } catch (error) {
      console.error(error);
      showAlert(root, state, error.message || "Failed to load data.", "danger");
      renderCards(root, config, ctx, state);
    }
  }

  function getContext(root) {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const buildingIndex = parts.indexOf("buildings");
    const floorIndex = parts.indexOf("floors");

    return {
      origin: window.location.origin,
      projectRoot: PROJECT_ROOT,
      apiBase: API_BASE_URL,
      campusTable: root.dataset.campusTable || "daffodil_smart_city",
      buildingId: root.dataset.buildingId || parts[buildingIndex + 1] || "",
      floorId: root.dataset.floorId || parts[floorIndex + 1] || "",
    };
  }

  async function loadParentTitle(config, ctx, state) {
    if (config === TYPES.building) {
      state.pageTitle = "Daffodil Smart City";
      document.title = "Daffodil Smart City | Electricity Monitor";
      return;
    }

    if (config === TYPES.level) {
      state.pageTitle = toTitleCase(ctx.buildingId);
      const url = `${ctx.apiBase}/building_catalog/list.php?campus_table=${encodeURIComponent(ctx.campusTable)}`;
      const payload = await fetchJson(url);
      const buildings = payload.data?.buildings || [];
      const match = buildings.find((item) => {
        const slug = item.slug || item.verification_id || item.building_verification_id;
        return slug === ctx.buildingId;
      });
      if (match) state.pageTitle = match.name || match.building_name || state.pageTitle;
      document.title = `${state.pageTitle} | Daffodil Smart City`;
      return;
    }

    if (config === TYPES.room) {
      state.pageTitle = toTitleCase(ctx.floorId);
      const url = `${ctx.apiBase}/level_catalog/list.php?building_verification_id=${encodeURIComponent(ctx.buildingId)}`;
      const payload = await fetchJson(url);
      const levels = payload.data?.levels || [];
      const match = levels.find((item) => {
        const slug = item.slug || item.level_verification_id;
        return slug === ctx.floorId;
      });
      if (match) state.pageTitle = match.name || match.level_name || state.pageTitle;
      document.title = `${state.pageTitle} | Daffodil Smart City`;
    }
  }

  async function loadCatalog(config, ctx) {
    const payload = await fetchJson(config.catalogUrl(ctx));
    const items = payload.data?.[config.catalogKey] || [];
    return items
      .map((item) => {
        const normalized = config.normalizeCatalog(item, ctx);
        normalized.link = config.makeLink(normalized.slug, ctx);
        return normalized;
      })
      .filter((item) => item.name && item.slug);
  }

  async function loadActive(config, ctx) {
    const payload = await fetchJson(config.activeUrl(ctx));
    const items = payload.data?.[config.activeKey] || [];
    return items
      .map((item) => config.normalizeActive(item, ctx))
      .filter((item) => item.name && item.slug);
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
    });

    const payload = await response.json();

    if (!response.ok || !isApiSuccess(payload)) {
      throw new Error(payload.message || "API request failed.");
    }

    return payload;
  }

  function renderShell(root, config, ctx, state) {
    const cityLink = `${ctx.projectRoot}/daffodil_smart_city/`;
    const adminLink = `${ctx.projectRoot}/electricity_frontend/dashboard.html`;
    const buildingLink = ctx.buildingId
      ? `${ctx.projectRoot}/daffodil_smart_city/buildings/${ctx.buildingId}/`
      : cityLink;
    const levelLink =
      ctx.buildingId && ctx.floorId
        ? `${ctx.projectRoot}/daffodil_smart_city/buildings/${ctx.buildingId}/floors/${ctx.floorId}/`
        : buildingLink;

    root.innerHTML = `
      <button class="burger-btn" id="burgerBtn" type="button" aria-label="Open menu">☰</button>

      <div class="sidebar-overlay" id="sidebarOverlay"></div>

      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-logo">⚡</div>
          <div>
            <h2 class="sidebar-title">${escapeHtml(config.managerTitle)}</h2>
            <p class="sidebar-subtitle">Electricity Monitor</p>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a href="${escapeAttribute(cityLink)}">Daffodil Smart City</a>
          <a href="${escapeAttribute(adminLink)}">Admin Dashboard</a>
          ${
            config === TYPES.level || config === TYPES.room
              ? `<a href="${escapeAttribute(buildingLink)}">Building Home</a>`
              : ""
          }
          ${config === TYPES.room ? `<a href="${escapeAttribute(levelLink)}">Level Home</a>` : ""}
        </nav>
      </aside>

      <main class="entity-page">
        <section class="entity-shell">
          <div id="pageAlert" class="alert hidden"></div>

          <header class="entity-header">
            <div>
              <p class="kicker">${escapeHtml(config.pageKicker)}</p>
              <h1 id="pageTitle">${escapeHtml(state.pageTitle)}</h1>
              <p>${escapeHtml(config.description)}</p>
            </div>

            <button type="button" class="primary-btn" id="addEntityBtn">${escapeHtml(config.addButton)}</button>
          </header>

          <section class="card-panel">
            <p class="kicker">${escapeHtml(config.panelKicker)}</p>
            <h2>${escapeHtml(config.panelTitle)}</h2>
            <div class="entity-grid" id="entityGrid"></div>
          </section>
        </section>
      </main>

      <div class="modal hidden" id="entityModal">
        <div class="modal-card">
          <div class="modal-head">
            <div>
              <p class="kicker">${escapeHtml(config.modalKicker)}</p>
              <h2>${escapeHtml(config.modalTitle)}</h2>
            </div>
            <button type="button" class="close-btn" id="modalCloseBtn">×</button>
          </div>

          <form id="entityForm">
            <div class="form-grid">
              <div class="form-field suggest-wrap">
                <label for="entityName">${escapeHtml(config.nameLabel)}</label>
                <input id="entityName" autocomplete="off" placeholder="Select or type name" />
                <div class="black-suggestion-box hidden" id="nameSuggestions"></div>
              </div>

              <div class="form-field suggest-wrap">
                <label for="entitySlug">${escapeHtml(config.slugLabel)}</label>
                <input id="entitySlug" autocomplete="off" placeholder="verification_id" />
                <div class="black-suggestion-box hidden" id="slugSuggestions"></div>
              </div>

              <div class="form-field suggest-wrap">
                <label for="entityLink">${escapeHtml(config.linkLabel)}</label>
                <input id="entityLink" autocomplete="off" placeholder="Paste homepage link" />
                <div class="black-suggestion-box hidden" id="linkSuggestions"></div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="secondary-btn" id="modalCancelBtn">Cancel</button>
              <button type="submit" class="primary-btn" id="saveEntityBtn">${escapeHtml(config.saveLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function bindEvents(root, config, ctx, state) {
    const burgerBtn = root.querySelector("#burgerBtn");
    const sidebar = root.querySelector("#sidebar");
    const overlay = root.querySelector("#sidebarOverlay");
    const modal = root.querySelector("#entityModal");
    const form = root.querySelector("#entityForm");

    const nameInput = root.querySelector("#entityName");
    const slugInput = root.querySelector("#entitySlug");
    const linkInput = root.querySelector("#entityLink");

    const nameBox = root.querySelector("#nameSuggestions");
    const slugBox = root.querySelector("#slugSuggestions");
    const linkBox = root.querySelector("#linkSuggestions");

    root.addEventListener("click", async (event) => {
      const addBtn = event.target.closest("#addEntityBtn");
      const closeBtn = event.target.closest("#modalCloseBtn");
      const cancelBtn = event.target.closest("#modalCancelBtn");
      const overlayClick = event.target === modal;
      const burgerClick = event.target.closest("#burgerBtn");
      const sidebarOverlayClick = event.target === overlay;

      if (addBtn) {
        event.preventDefault();
        openModal(root);
        return;
      }

      if (closeBtn || cancelBtn || overlayClick) {
        event.preventDefault();
        closeModal(root);
        return;
      }

      if (burgerClick) {
        event.preventDefault();

        const isOpen = sidebar.classList.toggle("open");
        overlay.classList.toggle("show", isOpen);
        document.body.classList.toggle("sidebar-open", isOpen);
        burgerBtn.textContent = isOpen ? "×" : "☰";
        return;
      }

      if (sidebarOverlayClick) {
        event.preventDefault();
        closeSidebar();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSidebar();
        closeModal(root);
        hideAllSuggestions(root);
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".suggest-wrap")) {
        hideAllSuggestions(root);
      }
    });

    setupSuggestion(nameInput, nameBox, () => getSuggestions(state, nameInput.value), (item) =>
      selectSuggestion(root, config, ctx, item)
    );

    setupSuggestion(slugInput, slugBox, () => getSuggestions(state, slugInput.value), (item) =>
      selectSuggestion(root, config, ctx, item)
    );

    setupSuggestion(linkInput, linkBox, () => getSuggestions(state, linkInput.value), (item) =>
      selectSuggestion(root, config, ctx, item)
    );

    nameInput.addEventListener("input", () => {
      const match = findByName(state.catalog, nameInput.value);
      if (match) {
        selectSuggestion(root, config, ctx, match);
      }
    });

    slugInput.addEventListener("input", () => {
      const slug = slugInput.value.trim();
      if (slug) {
        linkInput.value = config.makeLink(slug, ctx);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveEntity(root, config, ctx, state);
    });

    function closeSidebar() {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
      document.body.classList.remove("sidebar-open");
      burgerBtn.textContent = "☰";
    }
  }

  function setupSuggestion(input, box, getItems, onSelect) {
    input.addEventListener("focus", () => renderSuggestionBox(box, getItems(), onSelect));
    input.addEventListener("input", () => renderSuggestionBox(box, getItems(), onSelect));
  }

  function getSuggestions(state, query = "") {
    const search = query.trim().toLowerCase();

    return state.catalog.filter((item) => {
      if (!search) return true;

      return (
        String(item.id || "").includes(search) ||
        String(item.name || "").toLowerCase().includes(search) ||
        String(item.slug || "").toLowerCase().includes(search) ||
        String(item.link || "").toLowerCase().includes(search)
      );
    });
  }

  function renderSuggestionBox(box, items, onSelect) {
    hideAllSuggestionBoxesExcept(box);
    box.innerHTML = "";

    const unique = [];
    const seen = new Set();

    items.forEach((item) => {
      const key = `${item.id}-${item.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    if (!unique.length) {
      hideSuggestionBox(box);
      return;
    }

    unique.slice(0, 12).forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "black-suggestion-item";
      btn.innerHTML = `
        <span class="suggestion-id">ID: ${escapeHtml(item.id || "-")}</span>
        <span class="suggestion-name">${escapeHtml(item.name)}</span>
        <span class="suggestion-link">${escapeHtml(item.link)}</span>
      `;

      btn.addEventListener("mousedown", (event) => event.preventDefault());
      btn.addEventListener("click", () => {
        onSelect(item);
        hideSuggestionBox(box);
      });

      box.appendChild(btn);
    });

    box.classList.remove("hidden");
  }

  function selectSuggestion(root, config, ctx, item) {
    const nameInput = root.querySelector("#entityName");
    const slugInput = root.querySelector("#entitySlug");
    const linkInput = root.querySelector("#entityLink");

    nameInput.value = item.name;
    slugInput.value = item.slug;
    linkInput.value = item.link || config.makeLink(item.slug, ctx);
  }

  async function saveEntity(root, config, ctx, state) {
    const saveBtn = root.querySelector("#saveEntityBtn");
    const nameInput = root.querySelector("#entityName");
    const slugInput = root.querySelector("#entitySlug");
    const linkInput = root.querySelector("#entityLink");

    const form = {
      name: nameInput.value.trim(),
      slug: slugInput.value.trim(),
      link: linkInput.value.trim(),
    };

    hideAllSuggestions(root);
    hideAlert(root);

    if (!form.name) return inputError(root, state, "Name is required.", nameInput);
    if (!form.slug) return inputError(root, state, "Verification ID is required.", slugInput);

    if (!/^[a-z0-9_]{2,180}$/.test(form.slug)) {
      return inputError(root, state, "Verification ID can contain only lowercase letters, numbers, and underscore.", slugInput);
    }

    if (!form.link) return inputError(root, state, "Homepage link is required.", linkInput);

    if (form.link.toLowerCase().startsWith("javascript:") || form.link.toLowerCase().startsWith("data:")) {
      return inputError(root, state, "Invalid homepage link.", linkInput);
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      const payload = await fetchJson(config.createUrl(ctx), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.payload(form, ctx)),
      });

      closeModal(root);
      showAlert(root, state, payload.message || "Saved successfully.", "success");

      state.active = await loadActive(config, ctx);
      renderCards(root, config, ctx, state);
    } catch (error) {
      console.error(error);
      showAlert(root, state, error.message || "Failed to save.", "danger");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = config.saveLabel;
    }
  }

  async function removeEntity(root, config, ctx, state, item) {
    if (!window.confirm(`Remove ${item.name}?`)) return;

    hideAlert(root);
    hideAllSuggestions(root);

    try {
      const payload = await fetchJson(config.deleteUrl(ctx), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });

      showAlert(root, state, payload.message || "Removed successfully.", "success");

      state.active = await loadActive(config, ctx);
      renderCards(root, config, ctx, state);
    } catch (error) {
      console.error(error);
      showAlert(root, state, error.message || "Failed to remove.", "danger");
    }
  }

  function renderCards(root, config, ctx, state) {
    const grid = root.querySelector("#entityGrid");
    grid.innerHTML = "";

    if (!state.active.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>${escapeHtml(config.emptyTitle)}</strong>
          <span>${escapeHtml(config.emptyText)}</span>
        </div>
      `;
      return;
    }

    state.active.forEach((item) => {
      const card = document.createElement("article");
      card.className = "entity-card";
      card.innerHTML = `
        <h3>${escapeHtml(item.name)}</h3>
        <div class="entity-card-actions">
          <a class="primary-btn" href="${escapeAttribute(item.link || "#")}">${escapeHtml(config.openLabel)}</a>
          <button type="button" class="danger-btn">Remove</button>
        </div>
      `;

      const openLink = card.querySelector("a");
      const removeBtn = card.querySelector("button");

      if (!item.link) {
        openLink.addEventListener("click", (event) => {
          event.preventDefault();
          showAlert(root, state, "Homepage link not found.", "danger");
        });
      }

      removeBtn.addEventListener("click", () => removeEntity(root, config, ctx, state, item));
      grid.appendChild(card);
    });
  }

  function updateHeader(root, config, state) {
    const title = root.querySelector("#pageTitle");
    if (title) title.textContent = state.pageTitle;
  }

  function openModal(root) {
    const modal = root.querySelector("#entityModal");
    const form = root.querySelector("#entityForm");
    const nameInput = root.querySelector("#entityName");

    hideAlert(root);
    hideAllSuggestions(root);
    form.reset();

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    setTimeout(() => nameInput.focus(), 60);
  }

  function closeModal(root) {
    const modal = root.querySelector("#entityModal");
    const form = root.querySelector("#entityForm");

    hideAllSuggestions(root);
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    form.reset();
  }

  function inputError(root, state, message, input) {
    showAlert(root, state, message, "danger");
    input.focus();
  }

  function showAlert(root, state, message, type = "danger") {
    const alert = root.querySelector("#pageAlert");
    if (!alert) return;

    if (state?.alertTimer) clearTimeout(state.alertTimer);

    alert.textContent = message;
    alert.className = `alert ${type}`;

    if (state) {
      state.alertTimer = setTimeout(() => hideAlert(root), 4500);
    }
  }

  function hideAlert(root) {
    const alert = root.querySelector("#pageAlert");
    if (!alert) return;

    alert.textContent = "";
    alert.className = "alert hidden";
  }

  function hideSuggestionBox(box) {
    if (!box) return;
    box.classList.add("hidden");
    box.innerHTML = "";
  }

  function hideAllSuggestions(root) {
    root.querySelectorAll(".black-suggestion-box").forEach(hideSuggestionBox);
  }

  function hideAllSuggestionBoxesExcept(activeBox) {
    document.querySelectorAll(".black-suggestion-box").forEach((box) => {
      if (box !== activeBox) hideSuggestionBox(box);
    });
  }

  function findByName(items, name) {
    const clean = String(name || "").trim().toLowerCase();
    if (!clean) return null;
    return items.find((item) => item.name.toLowerCase() === clean) || null;
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
})();