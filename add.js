// 팁 추가 팝업. index.html 의 <dialog id="addDialog"> 안에서 동작한다.
// 저장/삭제하면 "tips-changed" 이벤트를 보내고, 지도 화면(app.js)이 그걸 받아 다시 그린다.
(() => {
  const CATS = window.CATEGORIES.filter(c => c.id !== "heritage"); // 백년가게는 공공데이터 전용
  const catById = Object.fromEntries(CATS.map(c => [c.id, c]));
  const STORE_KEY = "localguide.myTips.v1", NAME_KEY = "localguide.myName";
  const QUICK_TAGS = ["English menu", "English spoken", "Foreign cards OK", "Apple Pay OK", "Solo-friendly", "Vegetarian option", "24h", "Tax refund"];
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: keep in memory */ } },
  };

  const dialog = $("addDialog"), form = $("tipForm");
  const state = { mine: [], latlng: null, cat: CATS[0].id, tags: new Set(), editing: null };
  const changed = id => window.dispatchEvent(new CustomEvent("tips-changed", { detail: { id } }));

  // ---------- 팝업 안의 작은 지도 ----------
  let map = null, pin = null;
  const pinIcon = cat => L.divIcon({
    className: "",
    html: `<div class="pin" style="background:${cat.color}"><i>${cat.emoji}</i></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34],
  });

  function ensureMap(center) {
    if (!map) {
      map = L.map("addMap", { zoomControl: false }).setView(center, 17);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", e => setLocation(e.latlng));
    }
    map.invalidateSize(); // dialog 가 열린 뒤에야 크기가 잡힌다
    map.setView(center, 17, { animate: false });
  }

  function setLocation(latlng, pan) {
    state.latlng = L.latLng(latlng);
    if (!pin) {
      pin = L.marker(state.latlng, { icon: pinIcon(catById[state.cat]), draggable: true }).addTo(map);
      pin.on("dragend", () => setLocation(pin.getLatLng()));
    } else pin.setLatLng(state.latlng);
    if (pan) map.setView(state.latlng, Math.max(map.getZoom(), 17), { animate: false });
    setStatus("📍 Pin set. Drag it to adjust. 핀을 끌어 위치를 고칠 수 있어요.", true);
    hideError();
  }
  function clearLocation() {
    state.latlng = null;
    if (pin) { pin.remove(); pin = null; }
    found = []; showResults();
    setStatus("Type an address above, or tap the map to drop a pin. 주소를 입력하거나 지도를 눌러 핀을 놓으세요.");
  }

  // ---------- 주소 / 장소 이름으로 찾기 ----------
  // OpenStreetMap(Nominatim) 검색. 정책상 자동완성은 안 되고, Find 를 누를 때만 한 번 조회한다.
  // 한국 주소는 건물이 아니라 길 단위로만 잡히는 경우가 많아, 찾은 뒤 핀을 끌어 맞추게 한다.
  const addrInput = $("addrInput"), addrResults = $("addrResults");
  let found = [], searching = false;

  function setStatus(msg, ok) {
    $("locStatus").textContent = msg;
    $("locStatus").classList.toggle("ok", !!ok);
  }
  function showResults() {
    addrResults.hidden = found.length === 0;
    addrResults.innerHTML = found.map((r, i) => `<li><button type="button" data-i="${i}">${esc(r.display_name)}</button></li>`).join("");
  }
  async function findAddress() {
    const q = addrInput.value.trim();
    if (!q || searching) return;
    searching = true; found = []; showResults();
    setStatus("Searching… 찾는 중");
    try {
      const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
        q, format: "jsonv2", limit: 5, countrycodes: "kr", "accept-language": "ko,en" });
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      found = await res.json();
      if (!found.length) setStatus("No match. Try a shorter address, or tap the map. 결과가 없어요. 주소를 짧게 줄이거나 지도를 눌러 주세요.");
      else if (found.length === 1) pickResult(0);
      else { setStatus("Pick one below. 아래에서 고르세요."); showResults(); }
    } catch {
      setStatus("Search failed. Tap the map instead. 검색에 실패했어요. 지도를 눌러 주세요.");
    } finally { searching = false; }
  }
  function pickResult(i) {
    const r = found[i]; if (!r) return;
    found = []; showResults();
    setLocation([+r.lat, +r.lon], true);
    setStatus("📍 Pin set from search. Check it and drag to the exact spot. 검색 위치에 핀을 놓았어요. 정확한 자리로 끌어 맞춰 주세요.", true);
  }
  $("addrFind").addEventListener("click", findAddress);
  addrInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); findAddress(); } // 폼 제출 대신 검색
  });
  addrResults.addEventListener("click", e => {
    const b = e.target.closest("button[data-i]"); if (b) pickResult(+b.dataset.i);
  });
  $("addNearMe").addEventListener("click", () => {
    if (!navigator.geolocation) return showError("Location isn't available in this browser.");
    navigator.geolocation.getCurrentPosition(
      pos => setLocation([pos.coords.latitude, pos.coords.longitude], true),
      () => showError("Couldn't get your location. Tap the map instead."),
      { enableHighAccuracy: true, timeout: 8000 });
  });

  // ---------- 카테고리 / 태그 선택 ----------
  function renderCats() {
    $("catPick").innerHTML = CATS.map(c =>
      `<button type="button" role="radio" data-cat="${c.id}" aria-checked="${c.id === state.cat}" aria-pressed="${c.id === state.cat}">${c.emoji} ${c.label}</button>`).join("");
    if (pin) pin.setIcon(pinIcon(catById[state.cat]));
  }
  $("catPick").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.cat = b.dataset.cat; renderCats();
  });
  function renderTags() {
    $("tagPick").innerHTML = QUICK_TAGS.map(t =>
      `<button type="button" data-tag="${esc(t)}" aria-pressed="${state.tags.has(t)}">${esc(t)}</button>`).join("");
  }
  $("tagPick").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const t = b.dataset.tag;
    state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t);
    renderTags();
  });
  form.tip.addEventListener("input", () => { $("tipCount").textContent = form.tip.value.length; });
  form.addEventListener("input", () => hideError());

  // ---------- 저장 ----------
  function showError(msg) { $("formError").textContent = msg; $("formError").hidden = false; $("formError").scrollIntoView({ block: "nearest" }); }
  function hideError() { $("formError").hidden = true; }

  function resetForm() {
    form.reset();
    form.by.value = store.get(NAME_KEY, ""); // 제보자 이름은 기억해 둔다
    state.cat = CATS[0].id; state.tags.clear(); state.editing = null;
    $("tipCount").textContent = 0;
    $("addTitle").textContent = "Add a tip";
    $("saveBtn").textContent = "Save tip";
    clearLocation(); renderCats(); renderTags(); hideError();
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = k => form[k].value.trim();
    // 이름은 form.name 이 폼 자체의 name 속성과 겹치므로 elements 로 읽는다
    const name = form.elements.name.value.trim();
    if (!state.latlng) return showError("Set the location first: find an address or tap the map. 주소를 찾거나 지도를 눌러 위치를 먼저 정해 주세요.");
    if (!name) { form.elements.name.focus(); return showError("Add the name in English. 영문 이름을 적어 주세요."); }
    if (!v("tip")) { form.tip.focus(); return showError("Write your tip. 팁을 적어 주세요."); }

    const extra = v("tags").split(",").map(s => s.trim()).filter(Boolean);
    const p = {
      id: state.editing || "u" + Date.now().toString(36),
      name, ko: v("ko"), cat: state.cat,
      lat: +state.latlng.lat.toFixed(6), lng: +state.latlng.lng.toFixed(6),
      tip: v("tip"),
      tags: [...new Set([...QUICK_TAGS.filter(t => state.tags.has(t)), ...extra])],
      by: v("by"),
    };
    const i = state.mine.findIndex(x => x.id === p.id);
    if (i >= 0) state.mine[i] = p; else state.mine.push(p);
    store.set(STORE_KEY, state.mine);
    store.set(NAME_KEY, p.by);
    dialog.close();
    changed(p.id); // 지도 화면이 새 팁을 선택해서 보여준다
  });
  $("resetBtn").addEventListener("click", resetForm);
  $("addClose").addEventListener("click", () => dialog.close());
  // 팝업 바깥(어두운 배경)을 누르면 닫는다
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });

  // ---------- 내가 추가한 팁 ----------
  function renderMine() {
    $("mine").hidden = state.mine.length === 0;
    $("mineCount").textContent = `(${state.mine.length})`;
    $("mineList").innerHTML = state.mine.map(p => {
      const c = catById[p.cat] || CATS[0];
      return `<li data-id="${esc(p.id)}">
        <div class="ico" style="background:${c.color}">${c.emoji}</div>
        <div><div class="nm">${esc(p.name)}</div>${p.ko ? `<div class="ko">${esc(p.ko)}</div>` : ""}<p class="tip">${esc(p.tip)}</p></div>
        <div class="acts"><button type="button" data-act="edit">Edit</button><button type="button" data-act="del">Delete</button></div>
      </li>`;
    }).join("");
  }
  $("mineList").addEventListener("click", e => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const id = b.closest("li").dataset.id, p = state.mine.find(x => x.id === id);
    if (!p) return;
    if (b.dataset.act === "del") {
      if (!confirm(`Delete "${p.name}"?`)) return;
      state.mine = state.mine.filter(x => x.id !== id);
      store.set(STORE_KEY, state.mine);
      if (state.editing === id) resetForm();
      renderMine();
      return changed(null);
    }
    // edit: 폼에 다시 채운다
    state.editing = id;
    state.cat = catById[p.cat] ? p.cat : CATS[0].id;
    state.tags = new Set(p.tags.filter(t => QUICK_TAGS.includes(t)));
    form.elements.name.value = p.name; form.ko.value = p.ko || ""; form.tip.value = p.tip;
    form.tags.value = p.tags.filter(t => !QUICK_TAGS.includes(t)).join(", ");
    form.by.value = p.by || "";
    $("tipCount").textContent = p.tip.length;
    $("addTitle").textContent = "Edit tip";
    $("saveBtn").textContent = "Update tip";
    renderCats(); renderTags();
    setLocation([p.lat, p.lng], true);
    dialog.querySelector(".scroll").scrollTo({ top: 0, behavior: "smooth" });
  });

  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.mine, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my-tips.json" });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ---------- 열기 ----------
  // center: 지도 화면에서 보고 있던 위치. 팝업 지도가 거기서 시작한다.
  window.AddTip = {
    open(center) {
      state.mine = store.get(STORE_KEY, []);
      resetForm();
      renderMine();
      dialog.showModal();
      ensureMap(center);
      dialog.querySelector(".scroll").scrollTop = 0;
    },
  };
})();
