(() => {
  const PROJECT_ROOT = window.location.pathname.split("/daffodil_smart_city")[0];
  const API_BASE_URL = `${window.location.origin}${PROJECT_ROOT}/electricity_api`;

  document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("diuRoomHome");
    if (!root) return;

    const parts = window.location.pathname.split("/").filter(Boolean);
    const buildingIndex = parts.indexOf("buildings");
    const floorIndex = parts.indexOf("floors");
    const roomIndex = parts.indexOf("rooms");

    const buildingId = root.dataset.buildingId || parts[buildingIndex + 1] || "";
    const floorId = root.dataset.floorId || parts[floorIndex + 1] || "";
    const roomId = root.dataset.roomId || parts[roomIndex + 1] || "";

    const backLink = `${PROJECT_ROOT}/daffodil_smart_city/buildings/${buildingId}/floors/${floorId}/`;

    let roomTitle = toTitleCase(roomId);

    try {
      const url = `${API_BASE_URL}/room_pages/list.php?building_verification_id=${encodeURIComponent(buildingId)}&floor_verification_id=${encodeURIComponent(floorId)}`;
      const response = await fetch(url, { credentials: "include" });
      const result = await response.json();

      if (response.ok && (result.status === true || result.success === true)) {
        const rooms = result.data?.rooms || [];
        const match = rooms.find((room) => room.room_verification_id === roomId);
        if (match) roomTitle = match.room_name || roomTitle;
      }
    } catch (error) {
      console.error(error);
    }

    document.title = `${roomTitle} | Daffodil Smart City`;

    root.innerHTML = `
      <main class="entity-page">
        <section class="entity-shell">
          <header class="entity-header">
            <div>
              <p class="kicker">Room Home</p>
              <h1>${escapeHtml(roomTitle)}</h1>
              <p>${escapeHtml(toTitleCase(buildingId))} / ${escapeHtml(toTitleCase(floorId))}</p>
            </div>

            <a class="primary-btn" href="${escapeAttribute(backLink)}">Back to Level</a>
          </header>

          <section class="card-panel">
            <p class="kicker">Room Details</p>
            <h2>Electricity Monitoring</h2>
            <div class="empty-state">
              <strong>Room page ready</strong>
              <span>Device and reading UI can be added here later from this single shared file.</span>
            </div>
          </section>
        </section>
      </main>
    `;
  });

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