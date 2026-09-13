/* Wild Rift Map Planner — champions only, vanilla JS */
const $ = (sel) => document.querySelector(sel);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const uid = () => `t${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;

const state = {
  cam: { x: 0, y: 0, zoom: 1 },
  tokens: [], // {id, src, name, team, x, y, grayscale} — always 10
  arrows: [],
  wards: [],
  labels: [], // {id, tokenId, text}
  selected: null, // {id}
  structGray: {}, // structId -> true (B&W + X)
};

const MAX_TOKENS = 10;
let pendingSwapId = null;

const viewport = $("#viewport");
const world = $("#world");
const layerStructs = $("#layer-structs");
const layerTokens = $("#layer-tokens");

/* ---------- map tools ---------- */
let activeTool = null;
let arrowStart = null;
let arrowPreview = null;
const toolHints = {
  arrow: "Click a character or an arrow tip. Press Esc to exit.",
  ward: "Click the map to place a ward. Press Esc to exit.",
  text: "Click a character to attach a text. Press Esc to exit.",
};
function selectTool(tool) {
  activeTool = tool;
  arrowStart = arrowPreview = null;
  world.classList.toggle("tool-active", !!tool);
  ["arrow", "ward", "text"].forEach((name) => {
    $(`#tool-${name}`).setAttribute("aria-pressed", String(name === tool));
  });
  $("#tool-hint").textContent = toolHints[tool] || "";
  renderAnnotations();
}
function renderAnnotations() {
  const group = $("#arrows");
  group.replaceChildren();
  const arrows = [...state.arrows];
  if (arrowStart && arrowPreview) arrows.push({ start: arrowStart, end: arrowPreview, preview: true, team: arrowStart.team });
  arrows.forEach((arrow, idx) => {
    const teamCls = arrow.team === "blue" ? " team-blue" : arrow.team === "red" ? " team-red" : "";
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "arrow-group");
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hit.setAttribute("class", "arrow-hit");
    hit.setAttribute("x1", arrow.start.x * 10);
    hit.setAttribute("y1", arrow.start.y * 7.250755);
    hit.setAttribute("x2", arrow.end.x * 10);
    hit.setAttribute("y2", arrow.end.y * 7.250755);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "movement-arrow" + (arrow.preview ? " preview" : "") + teamCls);
    line.setAttribute("x1", arrow.start.x * 10);
    line.setAttribute("y1", arrow.start.y * 7.250755);
    line.setAttribute("x2", arrow.end.x * 10);
    line.setAttribute("y2", arrow.end.y * 7.250755);
    g.append(hit, line);
    if (!arrow.preview) {
      g.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        e.preventDefault();
        state.arrows.splice(idx, 1);
        arrowStart = arrowPreview = null;
        renderAnnotations();
      });
    }
    group.append(g);
    if (activeTool === "arrow" && !arrowStart && !arrow.preview) {
      const endpoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      endpoint.setAttribute("class", "arrow-endpoint" + teamCls);
      endpoint.setAttribute("cx", arrow.end.x * 10);
      endpoint.setAttribute("cy", arrow.end.y * 7.250755);
      endpoint.setAttribute("r", 8);
      group.append(endpoint);
    }
  });
  const wards = $("#layer-wards");
  wards.replaceChildren();
  state.wards.forEach((ward, idx) => {
    const el = document.createElement("div");
    el.className = "ward";
    el.style.left = `${ward.x}%`;
    el.style.top = `${ward.y}%`;
    el.title = "Ward — double-click to remove";
    const img = document.createElement("img");
    img.decoding = "async"; img.alt = "Ward"; img.draggable = false;
    withImgFallback(img, WARD_SRC); img.src = WARD_SRC;
    el.append(img);
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      e.preventDefault();
      state.wards.splice(idx, 1);
      renderAnnotations();
    });
    wards.append(el);
  });
  renderLabels();
}
function renderLabels() {
  const box = $("#layer-labels");
  if (!box) return;
  box.replaceChildren();
  // Group by champion to stack multiple boxes
  const byToken = {};
  state.labels.forEach((lb) => {
    (byToken[lb.tokenId] = byToken[lb.tokenId] || []).push(lb);
  });
  Object.entries(byToken).forEach(([tokenId, list]) => {
    const tk = tokenById(tokenId);
    if (!tk) return;
    list.forEach((lb, i) => {
      const el = document.createElement("div");
      el.className = "map-label";
      el.dataset.id = lb.id;
      // Slight overlap at the token base
      el.style.left = `${tk.x}%`;
      el.style.top = `${tk.y + 2.2 + i * 2.5}%`;
      const input = document.createElement("input");
      input.value = lb.text || "";
      input.placeholder = "Text...";
      input.maxLength = 60;
      input.setAttribute("aria-label", "Champion text");
      input.addEventListener("input", () => { lb.text = input.value; });
      input.addEventListener("pointerdown", (e) => e.stopPropagation());
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("dblclick", (e) => e.stopPropagation());
      const close = document.createElement("button");
      close.className = "label-close";
      close.title = "Remove text";
      close.innerHTML = "×";
      close.onclick = (e) => {
        e.stopPropagation();
        state.labels = state.labels.filter((l) => l.id !== lb.id);
        renderLabels();
      };
      el.append(input, close);
      // Prevent clicks on the box from triggering map tools
      el.addEventListener("pointerdown", (e) => e.stopPropagation());
      el.addEventListener("click", (e) => e.stopPropagation());
      el.addEventListener("dblclick", (e) => e.stopPropagation());
      box.append(el);
    });
  });
}
function mapPoint(e) {
  const rect = world.getBoundingClientRect();
  return { x: clamp((e.clientX - rect.left) / rect.width * 100, 0, 100),
    y: clamp((e.clientY - rect.top) / rect.height * 100, 0, 100) };
}
world.addEventListener("pointerdown", (e) => {
  if (activeTool) { e.stopPropagation(); e.preventDefault(); }
}, true);
world.addEventListener("dblclick", (e) => {
  if (e.target.closest && e.target.closest(".ward")) return; // let the ward handler remove it
  if (e.target.closest && e.target.closest(".arrow-group")) return; // let the arrow handler remove it
  if (activeTool) { e.stopPropagation(); e.preventDefault(); }
}, true);
world.addEventListener("click", (e) => {
  if (!activeTool || e.button !== 0) return;
  if (e.target.closest && e.target.closest(".ward")) { e.stopPropagation(); return; } // double-click to delete doesn't create wards
  if (e.target.closest && e.target.closest(".map-label")) { e.stopPropagation(); return; } // clicking the box creates nothing
  e.stopPropagation();
  const point = mapPoint(e);
  if (activeTool === "ward") state.wards.push(point);
  else if (activeTool === "text") {
    const tokenEl = e.target.closest ? e.target.closest(".token") : null;
    const token = tokenById(tokenEl?.dataset.id);
    if (!token) { selectTool(null); return; }
    state.labels.push({ id: uid(), tokenId: token.id, text: "" });
    renderLabels();
    // Focus the newly created input right on the canvas
    const box = $("#layer-labels");
    const last = box ? box.lastElementChild?.querySelector("input") : null;
    if (last) { last.focus(); last.select(); }
    return;
  }
  else if (!arrowStart) {
    // Pixel tolerance keeps the tip easy to select at any zoom.
    const rect = world.getBoundingClientRect();
    let nearest = null, distance = 14;
    state.arrows.forEach((arrow) => {
      const d = Math.hypot((point.x - arrow.end.x) * rect.width / 100,
        (point.y - arrow.end.y) * rect.height / 100);
      if (d <= distance) { nearest = { x: arrow.end.x, y: arrow.end.y, team: arrow.team }; distance = d; }
    });
    const token = tokenById(e.target.closest(".token")?.dataset.id);
    const start = nearest || (token ? { x: token.x, y: token.y, team: token.team } : null);
    if (!start) { selectTool(null); return; }
    arrowStart = { x: start.x, y: start.y, team: start.team || "neutral" };
    arrowPreview = arrowStart;
    $("#tool-hint").textContent = "Move the mouse and click the destination. Esc cancels.";
  }
  else {
    if (Math.hypot(point.x - arrowStart.x, point.y - arrowStart.y) < 0.1) return;
    state.arrows.push({ start: { x: arrowStart.x, y: arrowStart.y }, end: point, team: arrowStart.team || "neutral" });
    arrowStart = arrowPreview = null;
    $("#tool-hint").textContent = toolHints.arrow;
  }
  renderAnnotations();
}, true);
world.addEventListener("pointermove", (e) => {
  if (!arrowStart) return;
  arrowPreview = mapPoint(e);
  renderAnnotations();
});

/* ---------- camera ---------- */
const clampPan = () => {
  if (state.cam.zoom <= 1) { state.cam.x = 0; state.cam.y = 0; return; }
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const ww = world.offsetWidth * state.cam.zoom;
  const wh = world.offsetHeight * state.cam.zoom;
  const maxX = Math.max(0, (ww - vw) / 2 + 40);
  const maxY = Math.max(0, (wh - vh) / 2 + 40);
  state.cam.x = clamp(state.cam.x, -maxX, maxX);
  state.cam.y = clamp(state.cam.y, -maxY, maxY);
};
const applyCam = () => {
  clampPan();
  const { x, y, zoom } = state.cam;
  world.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${zoom})`;
  $("#zoom-label").textContent = `${Math.round(zoom * 100)}%`;
  viewport.classList.toggle("pannable", zoom > 1);
};

const setZoom = (z) => {
  state.cam.zoom = clamp(z, 0.5, 3);
  applyCam();
};

/* Pan the canvas: only when zoom > 100%. At 100% (or less) it disables and recenters. */
let panMoved = false;
function startCanvasPan(e) {
  if (state.cam.zoom <= 1) return;
  if (activeTool) return;
  if (e.button !== 0) return;
  if (e.target.closest && e.target.closest(".token, .structure, .ward, .map-label, .dock-bar, .team-rail, .map-zoom, .tool-hint, button")) return;
  e.preventDefault();
  const startX = e.clientX, startY = e.clientY;
  const origX = state.cam.x, origY = state.cam.y;
  panMoved = false;
  viewport.classList.add("panning");
  const move = (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) panMoved = true;
    state.cam.x = origX + dx;
    state.cam.y = origY + dy;
    applyCam();
  };
  const up = () => {
    viewport.classList.remove("panning");
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", up);
    // swallow the next click if there was a drag (avoids accidental deselect)
    if (panMoved) {
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      viewport.addEventListener("click", swallow, true);
      setTimeout(() => viewport.removeEventListener("click", swallow, true), 0);
      panMoved = false;
    }
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", up);
}
viewport.addEventListener("pointerdown", startCanvasPan);

/* ---------- selection ---------- */
const setSelected = (id) => {
  state.selected = id ? { id } : null;
  document.querySelectorAll(".token.selected")
    .forEach((el) => el.classList.remove("selected"));
  document.querySelectorAll(".team-card.selected")
    .forEach((el) => el.classList.remove("selected"));
  if (id) {
    const el = document.querySelector(`.token[data-id="${id}"]`);
    if (el) el.classList.add("selected");
    const card = document.querySelector(`.team-card[data-id="${id}"]`);
    if (card) card.classList.add("selected");
  }
};

const tokenById = (id) => state.tokens.find((t) => t.id === id);

/* ---------- fixed structures (towers/nexus) ---------- */
const toggleStruct = (id) => {
  if (state.structGray[id]) delete state.structGray[id];
  else state.structGray[id] = true;
  renderStructs();
};

function renderStructs() {
  layerStructs.innerHTML = "";
  STRUCTURES.forEach((s) => {
    const d = document.createElement("div");
    d.className = "structure kind-" + (s.kind || "tower") + (state.structGray[s.id] ? " grayscale" : "");
    d.dataset.id = s.id;
    d.title = `${s.label} — double-click to mark`;
    d.style.left = `${s.x}%`;
    d.style.top = `${s.y}%`;
    const img = document.createElement("img");
    const iconSrc = structIconFor(s);
    img.decoding = "async"; img.loading = "lazy"; img.alt = s.label; img.draggable = false;
    if (typeof withImgFallback === "function") withImgFallback(img, iconSrc);
    img.src = iconSrc;
    d.append(img);
    if (state.structGray[s.id]) {
      if (s.kind === "baron" || s.kind === "dragon") {
        const clock = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        clock.setAttribute("class", "clock-mark");
        clock.setAttribute("viewBox", "0 0 24 24");
        clock.innerHTML = '<circle cx="12" cy="12" r="9" fill="rgba(8,12,18,0.55)" stroke="#fff" stroke-width="2.4"/><path d="M12 7v5l3.5 2" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>';
        d.append(clock);
      } else {
        const x = document.createElement("img");
        x.className = "x-mark"; x.decoding = "async"; x.alt = "marked";
        if (typeof withImgFallback === "function") withImgFallback(x, X_MARK_SRC);
        x.src = X_MARK_SRC;
        x.draggable = false;
        d.append(x);
      }
    }
    d.addEventListener("dblclick", (e) => { e.stopPropagation(); e.preventDefault(); toggleStruct(s.id); });
    layerStructs.append(d);
  });
}

/* ---------- roster (5v5 rails, team by position) ---------- */
function renderRoster() {
  const blueRail = $("#team-blue");
  const redRail = $("#team-red");
  if (!blueRail || !redRail) return;
  blueRail.replaceChildren();
  redRail.replaceChildren();
  // Stable order by index: 0-4 blue (left), 5-9 red (right)
  const ordered = [...state.tokens].slice(0, MAX_TOKENS);
  while (ordered.length < MAX_TOKENS) ordered.push(null);
  const makeCard = (tk) => {
    if (!tk) {
      const empty = document.createElement("div");
      empty.className = "team-card empty";
      empty.style.opacity = "0.25";
      return empty;
    }
    const btn = document.createElement("div");
    btn.className = "team-card" + (tk.grayscale ? " is-gray" : "");
    if (state.selected && state.selected.id === tk.id) btn.classList.add("selected");
    btn.title = `${tk.name.replace(/-/g, " ")} — click to select · double-click to swap`;
    btn.dataset.id = tk.id;
    const icon = document.createElement("img");
    icon.className = "team-icon";
    icon.loading = "lazy"; icon.decoding = "async";
    icon.alt = tk.name;
    if (typeof withImgFallback === "function") withImgFallback(icon, tk.src);
    icon.src = tk.src;
    btn.addEventListener("click", () => setSelected(tk.id));
    btn.addEventListener("dblclick", (e) => { e.stopPropagation(); e.preventDefault(); openSwapPicker(tk.id); });
    btn.append(icon);
    return btn;
  };
  // Indexes 0-4 → blue (left), 5-9 → red (right)
  ordered.slice(0, 5).forEach((tk) => blueRail.append(makeCard(tk)));
  ordered.slice(5, 10).forEach((tk) => redRail.append(makeCard(tk)));
}

/* ---------- tokens (fixed board of 10) ---------- */
const addToken = ({ src, name, team = "blue", x = 50, y = 50 }) => {
  if (state.tokens.length >= MAX_TOKENS) return null;
  const tk = { id: uid(), src, name, team, x: clamp(x, 2, 98), y: clamp(y, 2, 98), grayscale: false };
  state.tokens = [...state.tokens, tk];
  renderTokens();
  renderRoster();
  setSelected(tk.id);
  return tk;
};

const swapToken = (id, { src, name }) => {
  state.tokens = state.tokens.map((t) =>
    t.id === id ? { ...t, src, name } : t
  );
  renderTokens();
  renderRoster();
  setSelected(id);
};

const toggleGrayscale = (id) => {
  state.tokens = state.tokens.map((t) =>
    t.id === id ? { ...t, grayscale: !t.grayscale } : t
  );
  renderTokens();
  renderRoster();
};

function renderTokens() {
  layerTokens.innerHTML = "";
  state.tokens.forEach((tk) => {
    const d = document.createElement("div");
    d.className = "token" + (tk.grayscale ? " grayscale" : "");
    d.dataset.id = tk.id;
    d.dataset.team = tk.team;
    d.title = `${tk.name} — drag to move · double-click to mark`;
    d.style.left = `${tk.x}%`;
    d.style.top = `${tk.y}%`;
    if (state.selected && state.selected.id === tk.id) d.classList.add("selected");
    const img = document.createElement("img");
    img.decoding = "async"; img.alt = tk.name; img.draggable = false;
    if (typeof withImgFallback === "function") withImgFallback(img, tk.src);
    img.src = tk.src;
    d.append(img);
    if (tk.grayscale) {
      const x = document.createElement("img");
      x.className = "x-mark"; x.decoding = "async"; x.alt = "marked";
      if (typeof withImgFallback === "function") withImgFallback(x, X_MARK_SRC);
      x.src = X_MARK_SRC;
      x.draggable = false;
      d.append(x);
    }
    d.addEventListener("pointerdown", (e) => startTokenDrag(e, tk.id));
    d.addEventListener("dblclick", (e) => { e.stopPropagation(); e.preventDefault(); toggleGrayscale(tk.id); });
    layerTokens.append(d);
  });
  renderLabels();
}

const screenDeltaToPct = () => {
  const r = world.getBoundingClientRect();
  return { sx: r.width / 100, sy: r.height / 100 };
};

/* ---------- token-linked arrows: moving clears the chain ---------- */
const ARROW_MATCH_TOL = 0.6; // % of the map — touched the old position, removed
const nearPt = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < ARROW_MATCH_TOL;
function pruneArrowsAt(pt) {
  const doomed = [{ x: pt.x, y: pt.y }];
  let pending = [...state.arrows];
  let changed = true;
  while (changed) {
    changed = false;
    const next = [];
    for (const a of pending) {
      const hit = doomed.some((d) => nearPt(a.start, d) || nearPt(a.end, d));
      if (hit) { doomed.push({ ...a.start }, { ...a.end }); changed = true; }
      else next.push(a);
    }
    pending = next;
  }
  if (pending.length !== state.arrows.length) {
    state.arrows = pending;
    arrowStart = arrowPreview = null;
    renderAnnotations();
  }
}

function startTokenDrag(e, id) {
  e.stopPropagation();
  const tk = tokenById(id);
  if (!tk) return;
  setSelected(id);
  renderRoster();
  const el = document.querySelector(`.token[data-id="${id}"]`);
  const { sx, sy } = screenDeltaToPct();
  const startX = e.clientX, startY = e.clientY;
  const origX = tk.x, origY = tk.y;
  let moved = false;
  if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const dx = (ev.clientX - startX) / sx;
    const dy = (ev.clientY - startY) / sy;
    if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 3) moved = true;
    tk.x = clamp(origX + dx, 2, 98);
    tk.y = clamp(origY + dy, 2, 98);
    el.style.left = `${tk.x}%`;
    el.style.top = `${tk.y}%`;
    renderLabels();
  };
  const up = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    state.tokens = state.tokens.map((t) => (t.id === id ? { ...t, x: tk.x, y: tk.y } : t));
    if (moved) renderRoster();
    if (Math.hypot(tk.x - origX, tk.y - origY) > 0.15) pruneArrowsAt({ x: origX, y: origY });
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}

/* ---------- background click to deselect ---------- */
viewport.addEventListener("click", (e) => {
  if (e.target === viewport || e.target === world || e.target.id === "basemap") {
    setSelected(null);
    renderRoster();
  }
});

/* ---------- champion modal (swap mode, fixed team by position) ---------- */
const openSwapPicker = (id) => {
  pendingSwapId = id;
  $("#champ-modal").hidden = false;
  $("#champ-search").value = "";
  renderChampGrid("");
  $("#champ-search").focus();
};

const closeSwapPicker = () => {
  pendingSwapId = null;
  $("#champ-modal").hidden = true;
};

function renderChampGrid(filter = "") {
  const grid = $("#champ-grid");
  grid.innerHTML = "";
  const q = filter.trim().toLowerCase();
  CHAMPIONS.filter((s) => !q || s.includes(q))
    .forEach((slug) => {
      const b = document.createElement("button");
      b.className = "champ-card";
      const img = document.createElement("img");
      const cSrc = championSrc(slug);
      img.loading = "lazy"; img.decoding = "async"; img.alt = slug;
      img.width = 84; img.height = 84;
      if (typeof withImgFallback === "function") withImgFallback(img, cSrc);
      img.src = cSrc;
      const s = document.createElement("span");
      s.textContent = slug.replace(/-/g, " ");
      b.append(img, s);
      b.title = slug;
      b.onclick = () => {
        if (!pendingSwapId) return;
        swapToken(pendingSwapId, {
          src: championSrc(slug),
          name: slug,
        });
        closeSwapPicker();
      };
      grid.append(b);
    });
  if (!grid.children.length) {
    const p = document.createElement("p");
    p.className = "muted"; p.textContent = "No champion found.";
    grid.append(p);
  }
}

/* ---------- export / import ---------- */
const exportBoard = () => {
  const data = {
    version: 2,
    arrows: state.arrows,
    wards: state.wards,
    app: "wild-rift-map-planner",
    savedAt: new Date().toISOString(),
    cam: { ...state.cam },
    structGray: Object.keys(state.structGray).filter((id) =>
      STRUCTURES.some((s) => s.id === id)
    ),
    tokens: state.tokens.map((t) => ({
      name: t.name,
      team: t.team,
      x: t.x,
      y: t.y,
      grayscale: !!t.grayscale,
      src: t.src,
    })),
    labels: state.labels.map((l) => {
      const idx = state.tokens.findIndex((t) => t.id === l.tokenId);
      return { token: idx, text: l.text || "" };
    }),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = URL.createObjectURL(blob);
  a.download = `wildrift-board-${stamp}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const importBoardData = (data) => {
  if (!data || typeof data !== "object") throw new Error("invalid format");
  const rawTokens = Array.isArray(data.tokens) ? data.tokens : [];
  const validTeams = new Set(["blue", "red", "neutral"]);
  const tokens = [];
  rawTokens.forEach((raw) => {
    if (!raw || typeof raw.name !== "string") return;
    const name = raw.name.trim();
    if (!name) return;
    const team = validTeams.has(raw.team) ? raw.team : "blue";
    const x = clamp(Number(raw.x) || 50, 2, 98);
    const y = clamp(Number(raw.y) || 50, 2, 98);
    const grayscale = !!raw.grayscale;
    let src = typeof raw.src === "string" && raw.src ? raw.src : null;
    if (src && typeof migrateSrc === "function") src = migrateSrc(src);
    if (!src) {
      if (name === "ward") src = WARD_SRC;
      else if (CHAMPIONS.includes(name)) src = championSrc(name);
      else return;
    }
    tokens.push({ id: uid(), src, name, team, x, y, grayscale });
  });
  const capped = tokens.slice(0, MAX_TOKENS).map((tk, idx) => ({
    ...tk,
    team: idx < 5 ? "blue" : "red",
  }));
  const rawGray = Array.isArray(data.structGray)
    ? data.structGray
    : (data.structGray && typeof data.structGray === "object"
      ? Object.keys(data.structGray).filter((k) => data.structGray[k])
      : []);
  const structIds = new Set(STRUCTURES.map((s) => s.id));
  const structGray = {};
  rawGray.forEach((id) => { if (structIds.has(id)) structGray[id] = true; });
  const validPoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const cleanPoint = (p) => ({ x: clamp(p.x, 0, 100), y: clamp(p.y, 0, 100) });
  state.wards = (Array.isArray(data.wards) ? data.wards : []).filter(validPoint).map(cleanPoint);
  state.arrows = (Array.isArray(data.arrows) ? data.arrows : [])
    .filter((a) => a && validPoint(a.start) && validPoint(a.end))
    .map((a) => ({
      start: cleanPoint(a.start),
      end: cleanPoint(a.end),
      team: ["blue", "red", "neutral"].includes(a.team) ? a.team : undefined,
    }));
  selectTool(null);
  state.tokens = capped;
  // Labels: new format {token: idx, text} or legacy {tokenId}
  const rawLabels = Array.isArray(data.labels) ? data.labels : [];
  state.labels = rawLabels
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const text = typeof raw.text === "string" ? raw.text.slice(0, 60) : "";
      if (Number.isInteger(raw.token) && capped[raw.token]) {
        return { id: uid(), tokenId: capped[raw.token].id, text };
      }
      if (typeof raw.tokenId === "string" && capped.some((t) => t.id === raw.tokenId)) {
        return { id: uid(), tokenId: raw.tokenId, text };
      }
      return null;
    })
    .filter(Boolean);
  state.structGray = structGray;
  state.selected = null;
  if (data.cam && typeof data.cam === "object") {
    state.cam = {
      x: Number(data.cam.x) || 0,
      y: Number(data.cam.y) || 0,
      zoom: clamp(Number(data.cam.zoom) || 1, 0.5, 3),
    };
  } else {
    state.cam = { x: 0, y: 0, zoom: 1 };
  }
  renderStructs();
  renderTokens();
  renderRoster();
  renderLabels();
  applyCam();
};

const importBoardFile = (file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importBoardData(JSON.parse(reader.result));
    } catch (err) {
      alert("Invalid file: could not import the board.");
    }
  };
  reader.readAsText(file);
};

/* ---------- wiring ---------- */
function wire() {
  ["arrow", "ward", "text"].forEach((tool) => {
    $(`#tool-${tool}`).onclick = () => selectTool(activeTool === tool ? null : tool);
  });
  $("#zoom-in").onclick = () => setZoom(state.cam.zoom * 1.2);
  $("#zoom-out").onclick = () => setZoom(state.cam.zoom / 1.2);
  $("#zoom-reset").onclick = () => { state.cam = { x: 0, y: 0, zoom: 1 }; applyCam(); };
  $("#btn-restart").onclick = () => {
    fetch("main.json")
      .then((r) => { if (!r.ok) throw new Error("main.json"); return r.json(); })
      .then((data) => importBoardData(data))
      .catch(() => importBoardData(cloneBoard(DEFAULT_BOARD)));
  };
  $("#btn-export").onclick = () => exportBoard();
  const fileInput = $("#file-import");
  $("#btn-import").onclick = () => fileInput.click();
  fileInput.addEventListener("change", (e) => {
    importBoardFile(e.target.files[0]);
    e.target.value = "";
  });
  const modal = $("#champ-modal");
  $("#champ-close").onclick = () => closeSwapPicker();
  modal.addEventListener("click", (e) => { if (e.target === modal) closeSwapPicker(); });
  $("#champ-search").addEventListener("input", (e) => renderChampGrid(e.target.value));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { selectTool(null); closeSwapPicker(); setSelected(null); renderRoster(); }
    if (e.key === "+" || e.key === "=") setZoom(state.cam.zoom * 1.15);
    if (e.key === "-") setZoom(state.cam.zoom / 1.15);
    if (e.key === "0") { state.cam = { x: 0, y: 0, zoom: 1 }; applyCam(); }
  });
  window.addEventListener("resize", applyCam);
}

/* ---------- boot (always 10 via main.json) ---------- */
renderStructs();
renderTokens();
renderRoster();
renderChampGrid("");
applyCam();
wire();
fetch("main.json")
  .then((r) => { if (!r.ok) throw new Error("main.json"); return r.json(); })
  .then((data) => importBoardData(data))
  .catch(() => importBoardData(cloneBoard(DEFAULT_BOARD)));