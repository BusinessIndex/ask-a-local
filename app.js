(() => {
  const AREAS = window.AREAS, CATS = window.CATEGORIES;
  const catById = Object.fromEntries(CATS.map(c => [c.id, c]));
  const STORE_KEY = "localguide.myTips.v1";
  const $ = id => document.getElementById(id);

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function loadMine() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
  }
  function saveMine() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.mine)); } catch { /* private mode: keep in memory */ }
  }

  const state = {
    center: { lat: AREAS[0].lat, lng: AREAS[0].lng, label: AREAS[0].name },
    radius: 1000,
    cats: new Set(), // empty = all
    applePay: false, // true면 "Apple Pay" 태그가 있는 곳만
    mine: loadMine(),
    adding: false,
    pendingLatLng: null,
    selected: null,
  };

  // ---------- map ----------
  const map = L.map("map", { zoomControl: false }).setView([state.center.lat, state.center.lng], 16);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  const circle = L.circle([0, 0], { radius: 0, color: "#e8590c", weight: 1, fillOpacity: 0.05, interactive: false }).addTo(map);
  const here = L.marker([0, 0], { icon: L.divIcon({ className: "", html: '<div class="here"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false, keyboard: false }).addTo(map);
  const markers = new Map();

  const pinIcon = cat => L.divIcon({
    className: "",
    html: `<div class="pin" style="background:${cat.color}"><i>${cat.emoji}</i></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32],
  });

  // ---------- helpers ----------
  function meters(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const fmtDist = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
  const walkMin = m => Math.max(1, Math.round(m / 75)); // ~4.5 km/h

  function nearby() {
    return [...window.SEED_PLACES, ...state.mine]
      .map(p => ({ ...p, d: meters(state.center, p) }))
      .filter(p => p.d <= state.radius && (state.cats.size === 0 || state.cats.has(p.cat)))
      .filter(p => !state.applePay || (p.tags || []).some(t => /apple\s*pay/i.test(t)))
      .sort((a, b) => a.d - b.d);
  }

  const tagsHtml = p => (p.tags?.length ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : "");

  function popupHtml(p) {
    const dest = encodeURIComponent((p.ko || p.name).replace(/,/g, " "));
    return `<div class="nm">${esc(p.name)}</div>
      ${p.ko ? `<div class="ko">${esc(p.ko)}</div>` : ""}
      <p class="tip">${esc(p.tip)}</p>${tagsHtml(p)}
      ${p.by ? `<div class="by">Tip from ${esc(p.by)}</div>` : ""}
      <a href="https://map.kakao.com/link/to/${dest},${p.lat},${p.lng}" target="_blank" rel="noopener">Directions (KakaoMap) ↗</a>`;
  }

  // ---------- render ----------
  function render() {
    const list = nearby();
    circle.setLatLng([state.center.lat, state.center.lng]).setRadius(state.radius);
    here.setLatLng([state.center.lat, state.center.lng]);

    markerLayer.clearLayers();
    markers.clear();
    for (const p of list) {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(catById[p.cat] || CATS[0]), title: p.name })
        .bindPopup(popupHtml(p))
        .on("click", () => select(p.id, false));
      m.addTo(markerLayer);
      markers.set(p.id, m);
    }

    $("summary").textContent = `${list.length} place${list.length === 1 ? "" : "s"} near ${state.center.label}`;
    $("results").innerHTML = list.length
      ? list.map(p => {
          const c = catById[p.cat] || CATS[0];
          return `<li data-id="${esc(p.id)}" class="${p.id === state.selected ? "sel" : ""}">
            <div class="ico" style="background:${c.color}">${c.emoji}</div>
            <div><div class="nm">${esc(p.name)}</div>${p.ko ? `<div class="ko">${esc(p.ko)}</div>` : ""}
              <p class="tip">${esc(p.tip)}</p>${tagsHtml(p)}</div>
            <div class="dist">${fmtDist(p.d)}<br>🚶 ${walkMin(p.d)} min</div>
          </li>`;
        }).join("")
      : `<li class="empty">No local tips match here yet.<br>Know a good spot? Tap <b>＋ Add a tip</b>.</li>`;

    $("exportBtn").hidden = state.mine.length === 0;
  }

  function select(id, openPopup = true) {
    state.selected = id;
    document.querySelectorAll("#results li").forEach(li => li.classList.toggle("sel", li.dataset.id === id));
    const m = markers.get(id);
    if (m && openPopup) { map.panTo(m.getLatLng()); m.openPopup(); }
    if (!openPopup) document.querySelector(`#results li[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // circle.getBounds()는 현재 줌의 픽셀 반경에 의존해 부정확할 수 있어 직접 계산한다
  function fitToRadius() {
    map.fitBounds(L.latLng(state.center.lat, state.center.lng).toBounds(state.radius * 2), { padding: [20, 20] });
  }

  function setCenter(lat, lng, label) {
    state.center = { lat, lng, label };
    state.selected = null;
    render();
    fitToRadius();
  }

  // ---------- chips ----------
  $("chips").innerHTML = `<button data-cat="" aria-pressed="true">All</button>` +
    CATS.map(c => `<button data-cat="${c.id}" aria-pressed="false">${c.emoji} ${c.label}</button>`).join("") +
    `<button data-pay aria-pressed="false" class="pay"> Apple Pay</button>`;
  const catChips = () => $("chips").querySelectorAll("button[data-cat]");
  $("chips").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if ("pay" in b.dataset) {
      state.applePay = !state.applePay;
      b.setAttribute("aria-pressed", state.applePay);
      return render();
    }
    const id = b.dataset.cat;
    if (!id) state.cats.clear();
    else state.cats.has(id) ? state.cats.delete(id) : state.cats.add(id);
    catChips().forEach(x =>
      x.setAttribute("aria-pressed", x.dataset.cat ? state.cats.has(x.dataset.cat) : state.cats.size === 0));
    render();
  });

  $("radius").addEventListener("change", e => { state.radius = +e.target.value; setCenter(state.center.lat, state.center.lng, state.center.label); });

  $("results").addEventListener("click", e => {
    const li = e.target.closest("li[data-id]"); if (li) select(li.dataset.id);
  });

  // ---------- area search ----------
  const areaInput = $("areaInput"), areaList = $("areaList");
  let matches = [], active = 0;
  const norm = s => s.toLowerCase().replace(/[\s\-()]/g, "");

  function showAreas() {
    const q = norm(areaInput.value);
    matches = AREAS.filter(a => !q || norm(a.name + a.ko + a.district).includes(q));
    active = 0;
    areaList.innerHTML = matches.length
      ? matches.map((a, i) => `<li data-i="${i}" class="${i === 0 ? "active" : ""}">${a.name} <small>${a.ko} · ${a.district}</small></li>`).join("")
      : `<li>No match — we only cover a few neighborhoods so far.</li>`;
    areaList.hidden = false;
  }
  function pickArea(a) {
    if (!a) return;
    areaInput.value = a.name;
    areaList.hidden = true;
    areaInput.blur();
    setCenter(a.lat, a.lng, a.name);
  }
  areaInput.addEventListener("focus", () => { areaInput.select(); showAreas(); });
  areaInput.addEventListener("input", showAreas);
  areaInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); pickArea(matches[active]); }
    else if (e.key === "Escape") areaList.hidden = true;
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!matches.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      areaList.querySelectorAll("li").forEach((li, i) => li.classList.toggle("active", i === active));
    }
  });
  areaList.addEventListener("mousedown", e => {
    const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); pickArea(matches[+li.dataset.i]); }
  });
  areaInput.addEventListener("blur", () => { areaList.hidden = true; });

  $("nearMe").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Location isn't available in this browser.");
    navigator.geolocation.getCurrentPosition(
      pos => { areaInput.value = ""; setCenter(pos.coords.latitude, pos.coords.longitude, "you"); },
      () => alert("Couldn't get your location. Pick a neighborhood instead."),
      { enableHighAccuracy: true, timeout: 8000 });
  });

  // ---------- add a tip ----------
  const dialog = $("addDialog"), form = $("addForm");
  $("catSelect").innerHTML = CATS.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join("");

  function setAdding(on) {
    state.adding = on;
    document.body.classList.toggle("adding", on);
    $("banner").hidden = !on;
  }
  $("addBtn").addEventListener("click", () => setAdding(true));
  $("cancelAdd").addEventListener("click", () => setAdding(false));
  $("addCancel").addEventListener("click", () => dialog.close());

  map.on("click", e => {
    if (!state.adding) return;
    state.pendingLatLng = e.latlng;
    setAdding(false);
    form.reset();
    dialog.showModal();
  });

  form.addEventListener("submit", () => {
    const f = new FormData(form), ll = state.pendingLatLng;
    const p = {
      id: "u" + Date.now().toString(36),
      name: f.get("name").trim(), ko: f.get("ko").trim(), cat: f.get("cat"),
      lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6),
      tip: f.get("tip").trim(),
      tags: f.get("tags").split(",").map(s => s.trim()).filter(Boolean),
      by: f.get("by").trim(),
    };
    state.mine.push(p);
    saveMine();
    // 새 팁이 현재 반경 밖이면 그 위치로 옮겨서 바로 보이게 한다
    if (meters(state.center, p) > state.radius) state.center = { lat: p.lat, lng: p.lng, label: "your new tip" };
    state.cats.clear();
    state.applePay = false;
    catChips().forEach(x => x.setAttribute("aria-pressed", !x.dataset.cat));
    $("chips").querySelector("[data-pay]").setAttribute("aria-pressed", false);
    render();
    select(p.id);
  });

  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.mine, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my-tips.json" });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ---------- go ----------
  areaInput.value = state.center.label;
  render();
  fitToRadius();
})();
