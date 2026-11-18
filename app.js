import { makeStore, DELETE } from "./store.js";
import { SEED_ITEMS } from "./seed.js";
import { FOODS } from "./foods.js";
import { CATEGORIES, catById, guessCategory, categoryOf, setLearned, suggestMonths, clean as cleanName } from "./categories.js";

/*
  Data model (Firestore)
  items/{id}    { name, place, units: [timestamp|null, ...], unknown, shelfMonths|null, min|null, note, addedAt, updatedAt }
                units = one entry per package, the date it went in (null = date not known). Count = units.length.
                "−" always removes the oldest entry (nulls count as oldest).
  places/{id}   { label, order, freezer? }   freezer = "andreia" (default when missing) or "ze"
  shopping/{id} { name, done, auto, itemId?, addedAt }   auto entries use id "auto-<itemId>".
  meta/seed, meta/places   one-time markers
*/

const DEFAULT_PLACES = [
  { id: "p1", label: "1ª Prateleira", order: 1 },
  { id: "p2", label: "2ª Prateleira", order: 2 },
  { id: "p3", label: "3ª Prateleira", order: 3 },
  { id: "g1", label: "1ª Gaveta", order: 4 },
  { id: "g2", label: "2ª Gaveta", order: 5 },
];
// Freezer Zé, top to bottom (photo of 2026-11-17). Created once when that freezer still has no shelves.
const ZE_PLACES = [
  { id: "ze-p12", label: "1ª e 2ª Prateleira", order: 1 },
  { id: "ze-p34", label: "3ª e 4ª Prateleira", order: 2 },
  { id: "ze-gp", label: "Gaveta pequena", order: 3 },
  { id: "ze-p5", label: "5ª Prateleira", order: 4 },
  { id: "ze-g1", label: "1ª Gaveta", order: 5 },
  { id: "ze-g2", label: "2ª Gaveta", order: 6 },
  { id: "ze-g3", label: "3ª Gaveta", order: 7 },
];
const SHELF_OPTIONS = [
  [null, "Sem validade"], [1, "1 mês"], [2, "2 meses"], [3, "3 meses"], [4, "4 meses"],
  [6, "6 meses"], [9, "9 meses"], [12, "1 ano"], [18, "1 ano e meio"], [24, "2 anos"],
];
const FREEZERS = [
  { id: "andreia", label: "Freezer Andréia" },
  { id: "ze", label: "Freezer Zé" },
];
const DAY = 86400000;
const TITLES = { freezer: "Freezerino", compras: "Compras", historico: "Histórico", prateleiras: "Prateleiras" };
const PEOPLE = ["Henrique", "Andréia", "Zé"];

// Offline support + notifications. Registered before anything else so the app opens without internet.
const swReady = "serviceWorker" in navigator
  ? navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).catch(e => { console.warn("sw", e); return null; })
  : Promise.resolve(null);

const store = await makeStore();

let items = new Map();
let places = [];
let shopping = new Map();
let devices = new Map();
let log = [];
let lastLearned = {};   // meta/cats: { cleaned food name: category picked by hand }
let logWho = null;     // history filter by person
const ready = { items: false, places: false, shopping: false };
const onceDone = new Set();
const pending = {};      // itemId -> { units, timer }
let subs = [];
let loadTimer = null;
let tab = tabFromHash();
let fz = loadFz();          // freezer being shown
let alertOnly = false;     // "only what expires soon" filter
let catFilter = null;      // show only one food group (category id), from both freezers

function loadFz() { try { const v = localStorage.getItem("fz"); return FREEZERS.some(f => f.id === v) ? v : "andreia"; } catch { return "andreia"; } }
function setFz(id) { fz = id; try { localStorage.setItem("fz", id); } catch {} render(); }

const $ = s => document.querySelector(s);

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const newId = name => (norm(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x") + "-" + Math.random().toString(36).slice(2, 6);

function toast(msg) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
const fail = () => toast("Não consegui salvar. Confira a internet e tente de novo.");
function setStatus(text, ok) { $("#status").textContent = text; $("#dot").classList.toggle("ok", !!ok); }

/* ---------- dates ---------- */

function addMonths(ts, m) { const d = new Date(ts); d.setMonth(d.getMonth() + m); return d.getTime(); }
const fmtDate = ts => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const todayInput = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fromInput = v => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d, 12).getTime(); };
const daysBetween = (a, b) => Math.floor((startOfDay(b) - startOfDay(a)) / DAY);
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

function ago(ts) {
  const d = daysBetween(ts, Date.now());
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 14) return `há ${d} dias`;
  if (d < 60) return `há ${Math.floor(d / 7)} semanas`;
  const m = Math.floor(d / 30);
  return m < 24 ? `há ${m} meses` : `há ${Math.floor(m / 12)} anos`;
}
function inDays(d) {
  if (d < 0) { const a = -d; return a === 1 ? "venceu ontem" : a < 60 ? `vencido há ${a} dias` : `vencido há ${Math.floor(a / 30)} meses`; }
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  if (d < 21) return `vence em ${d} dias`;
  if (d < 60) return `vence em ${Math.floor(d / 7)} semanas`;
  return `vence em ${Math.floor(d / 30)} meses`;
}
// Expiry of one dated unit for an item, or null.
// level: "bad" = less than 20% of its freezer time left (or expired), "soon" = less than half left, "ok" otherwise.
function unitExpiry(it, ts) {
  if (!it.shelfMonths || ts == null) return null;
  const date = addMonths(ts, it.shelfMonths);
  const d = daysBetween(Date.now(), date);
  const left = (date - Date.now()) / (date - ts);
  return { days: d, expired: d < 0, left, level: left < 0.2 ? "bad" : left < 0.5 ? "soon" : "ok", text: inDays(d), date };
}
// Expiry of an item = its oldest dated package (the next one to go out).
function itemExpiry(id, it) {
  if (!it || isUnknown(id)) return null;
  const dated = sortUnits(unitsOf(id)).filter(u => u != null);
  return dated.length ? unitExpiry(it, dated[0]) : null;
}

/* ---------- units helpers ---------- */

const sortUnits = u => [...u].sort((a, b) => (a ?? -Infinity) - (b ?? -Infinity));   // oldest first, unknown dates first
function unitsOf(id) {
  if (pending[id]) return pending[id].units;
  const u = items.get(id)?.units;
  return Array.isArray(u) ? u : [];
}
const isUnknown = id => !!items.get(id)?.unknown && !pending[id];
const placeLabel = id => places.find(p => p.id === id)?.label || "Sem lugar";
const fzOf = p => p?.freezer || "andreia";
const fzLabel = id => FREEZERS.find(f => f.id === id)?.label || "Freezer";
const fzShort = id => fzLabel(id).replace(/^Freezer /, "");
const placesIn = f => places.filter(p => fzOf(p) === f);
const itemFz = it => fzOf(places.find(p => p.id === it.place));
// "2ª Gaveta (Zé)"
const placeFull = id => { const p = places.find(x => x.id === id); return p ? `${p.label} (${fzShort(fzOf(p))})` : "Sem lugar"; };

/* ---------- tabs ---------- */

function tabFromHash() {
  const t = location.hash.slice(1);
  return TITLES[t] ? t : "freezer";
}
window.addEventListener("hashchange", () => { tab = tabFromHash(); closeSheet(); render(); window.scrollTo(0, 0); });

/* ---------- login ---------- */

function show(view) {
  $("#bootView").hidden = true;
  $("#loginView").hidden = view !== "login";
  $("#appView").hidden = view !== "app";
  $("#tabs").hidden = view !== "app";
  if (view !== "app") { $("#add").hidden = true; closeSheet(); }
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pw = $("#pw").value;
  if (!pw) return;
  const btn = $("#loginBtn");
  btn.disabled = true; btn.textContent = "Entrando…";
  $("#loginErr").textContent = "";
  try {
    await store.signIn(pw);
    $("#pw").value = "";
  } catch (err) {
    const code = err && err.code;
    $("#loginErr").textContent =
      code === "auth/too-many-requests" ? "Muitas tentativas. Espere alguns minutos e tente de novo." :
      code === "auth/network-request-failed" ? "Sem internet. Confira a conexão." :
      "Senha errada. Tente de novo.";
  }
  btn.disabled = false; btn.textContent = "Entrar";
});
$("#logout").addEventListener("click", () => store.signOut());

store.onAuth(user => {
  if (user) { show("app"); startData(); render(); }
  else { stopData(); show("login"); setTimeout(() => $("#pw").focus(), 50); }
});

/* ---------- data ---------- */

function once(key, fn) { if (!onceDone.has(key)) { onceDone.add(key); fn(); } }

function startData() {
  if (subs.length) return;
  setStatus(store.demo ? "Modo de teste (dados falsos)" : "Conectando…");
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => setStatus("Sem conexão: mostrando a última lista salva"), 10000);
  const synced = () => { clearTimeout(loadTimer); setStatus(store.demo ? "Modo de teste (dados falsos)" : "Sincronizado com a família", true); };
  const onErr = err => {
    clearTimeout(loadTimer);
    // Old session after the family account was replaced: back to the login screen.
    if (err && err.code === "permission-denied" && !store.demo) {
      store.signOut().finally(() => { $("#loginErr").textContent = "A senha da família mudou. Entre com a senha nova."; });
      return;
    }
    setStatus(err && err.code === "permission-denied" ? "Sem permissão. Confira as regras do Firestore." : "Não consegui carregar a lista");
    ready.items = ready.places = ready.shopping = true;
    render();
  };
  subs.push(store.listen("items", (m, meta) => {
    items = m; ready.items = true;
    if (!meta.fromCache) { synced(); once("items", () => { seedItems(); migrate(); }); }
    render();
  }, onErr));
  subs.push(store.listen("places", (m, meta) => {
    places = [...m].map(([id, d]) => ({ id, ...d })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    ready.places = true;
    if (!meta.fromCache) once("places", async () => { await seedPlaces(); await seedZePlaces(); });
    render();
  }, onErr));
  subs.push(store.listen("shopping", m => { shopping = m; ready.shopping = true; render(); }, onErr));
  subs.push(store.listen("devices", m => { devices = m; }, () => {}));
  // categories the family picked by hand, so the same food name is sorted the same way next time
  subs.push(store.listen("meta", m => { lastLearned = m.get("cats")?.map || {}; setLearned(lastLearned); render(); }, () => {}));
  subs.push(store.listen("log", m => {
    log = [...m].map(([id, d]) => ({ id, ...d })).sort((a, b) => b.at - a.at);
    if (tab === "historico") render();
  }, () => {}, { order: "at", limit: 300 }));
  if (!lsGet("who")) setTimeout(askWho, 400);
  refreshPush();
}

function stopData() {
  subs.forEach(u => u && u());
  subs = [];
  items = new Map(); places = []; shopping = new Map(); devices = new Map(); log = [];
  ready.items = ready.places = ready.shopping = false;
  onceDone.clear();
}

// First run only: copy the paper list into the database.
async function seedItems() {
  try {
    if (items.size || await store.get("meta", "seed")) return;
    const now = Date.now();
    const ops = SEED_ITEMS.map(({ id, qty, check, ...d }) => ({
      op: "set", c: "items", id,
      data: { ...d, units: qty == null ? [] : Array(qty).fill(null), unknown: qty == null, shelfMonths: null, min: null, note: "", updatedAt: now },
    }));
    ops.push({ op: "set", c: "meta", id: "seed", data: { at: now } });
    await store.batch(ops);
  } catch (e) { console.warn("seed failed", e); }
}

// Shelves used to be fixed in code; create them in the database once.
async function seedPlaces() {
  try {
    if (places.length || await store.get("meta", "places")) return;
    const ops = DEFAULT_PLACES.map(({ id, ...d }) => ({ op: "set", c: "places", id, data: d }));
    ops.push({ op: "set", c: "meta", id: "places", data: { at: Date.now() } });
    await store.batch(ops);
  } catch (e) { console.warn("places seed failed", e); }
}
async function seedZePlaces() {
  try {
    if (placesIn("ze").length || await store.get("meta", "placesZe")) return;
    const ops = ZE_PLACES.map(({ id, ...d }) => ({ op: "set", c: "places", id, data: { ...d, freezer: "ze" } }));
    ops.push({ op: "set", c: "meta", id: "placesZe", data: { at: Date.now() } });
    await store.batch(ops);
  } catch (e) { console.warn("Zé places seed failed", e); }
}

// Old format had a plain "qty" number. Turn it into one dated entry per package.
async function migrate() {
  const ops = [];
  for (const [id, d] of items) {
    if (Array.isArray(d.units)) continue;
    const q = typeof d.qty === "number" ? d.qty : null;
    ops.push({
      op: "update", c: "items", id,
      data: {
        units: q == null ? [] : Array(q).fill(d.addedAt ?? null),
        unknown: q == null,
        shelfMonths: d.shelfMonths ?? null, min: d.min ?? null,
        qty: DELETE, check: DELETE, updatedAt: Date.now(),
      },
    });
  }
  for (let i = 0; i < ops.length; i += 400) {
    try { await store.batch(ops.slice(i, i + 400)); } catch (e) { console.warn("migration failed", e); }
  }
}

/* ---------- shopping automation ---------- */

// Called after an item's count changes. Adds it to the shopping list when it falls below its minimum,
// and takes it off again (if not yet ticked) once there is enough.
// The same food can sit on several shelves (bacon on the 1st and 3rd): the minimum is checked against the total.
function syncShopping(id, item, count) {
  if (!item || item.unknown) return;
  const key = norm(item.name);
  const group = [[id, item], ...[...items.entries()].filter(([i, d]) => i !== id && norm(d.name) === key)];
  const t = foodTotal(item.name, { id, item, count });
  const withMin = group.filter(([, d]) => d.min != null);
  const owner = withMin[0]?.[0];   // one automatic entry per food
  for (const [i] of group) {
    const s = shopping.get("auto-" + i);
    if (i !== owner && s && !s.done) store.del("shopping", "auto-" + i).catch(fail);
  }
  if (!owner) return;
  const min = Math.max(...withMin.map(([, d]) => d.min));
  const sid = "auto-" + owner;
  const s = shopping.get(sid);
  if (!t.unknown && t.n < min) {
    if (!s || s.done) store.set("shopping", sid, { name: item.name, done: false, auto: true, itemId: owner, addedAt: Date.now() }).catch(fail);
  } else if (s && !s.done) {
    store.del("shopping", sid).catch(fail);
  }
}

// Total of one food across every shelf of both freezers. over = { id, item, count } for a change not saved yet.
function foodTotal(name, over) {
  const key = norm(name);
  let n = 0, unknown = false;
  const where = [];
  for (const [id, d] of items) {
    if (norm(d.name) !== key || (over && id === over.id)) continue;
    if (isUnknown(id)) unknown = true; else n += unitsOf(id).length;
    where.push(d.place);
  }
  if (over) { n += over.count; where.push(over.item.place); }
  return { n, unknown, where };
}

// "1ª Prateleira (Andréia)", "1ª Prateleira e 3ª Prateleira (Andréia)" or "3 lugares"
function placesText(where) {
  const ids = [...new Set(where)];
  if (ids.length <= 1) return placeFull(ids[0]);
  const ps = ids.map(id => places.find(p => p.id === id));
  const fzs = new Set(ps.map(p => p && fzOf(p)));
  if (ps.some(p => !p) || fzs.size > 1 || ids.length > 3) return `${ids.length} lugares`;
  const labels = ps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(p => p.label);
  return `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)} (${fzShort([...fzs][0])})`;
}
const totalText = t => t.unknown ? (t.n ? `${t.n}+?` : "?") : String(t.n);

/* ---------- render ---------- */

function render() {
  for (const a of document.querySelectorAll(".tabs a")) {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
  $("#viewTitle").textContent = TITLES[tab];
  document.title = tab === "freezer" ? "Freezerino" : `${TITLES[tab]} · Freezerino`;
  $("#freezerView").hidden = tab !== "freezer";
  $("#shopView").hidden = tab !== "compras";
  $("#placesView").hidden = tab !== "prateleiras";
  $("#logView").hidden = tab !== "historico";
  $("#add").hidden = $("#appView").hidden || tab !== "freezer";
  const open = [...shopping.values()].filter(s => !s.done).length;
  const badge = $("#shopBadge");
  badge.hidden = !open; badge.textContent = open;
  $("#bell").classList.toggle("on", pushState() === "on");
  const al = alerts();
  const fb = $("#fzBadge");
  fb.hidden = !al.bad.length; fb.textContent = al.bad.length;

  if (tab === "freezer") renderFreezer();
  else if (tab === "compras") renderShopping();
  else if (tab === "historico") renderLog();
  else renderPlaces();
}

// Foods that are past half (yellow) or under 20% (red) of their freezer time, across both freezers.
function alerts() {
  const bad = [], soon = [];
  for (const [id, it] of items) {
    const e = itemExpiry(id, it);
    if (!e || !unitsOf(id).length) continue;
    if (e.level === "bad") bad.push({ id, e, f: itemFz(it) });
    else if (e.level === "soon") soon.push({ id, e, f: itemFz(it) });
  }
  return { bad, soon, expired: bad.filter(a => a.e.expired).length };
}

function fzSwitch(onPick) {
  const al = alerts();
  const info = h("button", { type: "button", class: "fzinfo", "aria-label": `Mapa do ${fzLabel(fz)}`, onclick: () => openFreezerMap(fz) }, "i");
  return h("div", { class: "fzrow" }, info, h("div", { class: "fzs", role: "tablist", "aria-label": "Freezer" }, FREEZERS.map(f => {
    const n = al.bad.filter(a => a.f === f.id).length;
    return h("button", {
      type: "button", role: "tab", "aria-selected": String(f.id === fz), class: "fz",
      onclick: () => { if (onPick) onPick(); setFz(f.id); },
    }, f.label, n ? h("span", { class: "badge in" }, n) : null);
  })));
}

// Front view of Freezer Andréia (from the photo of 2026-11-17). Door on the left, top to bottom: 1ª and 2ª shelves,
// the ice and water dispenser, then 3ª, 4ª and 5ª (the family uses each block as one spot, e.g. "Porta 1ª e 2ª").
// Inside on the right: ice maker, 3 shelves, 2 drawers. Shelves in the app are matched by their names.
// Freezer Zé (photo of 2026-11-17) has nothing on the door: one column, top to bottom (see ZE_PLACES): the box with a
// flap lid (1ª e 2ª), the tall shelf (3ª e 4ª), a small drawer, the 5ª shelf, 1ª to 3ª Gaveta. Matched by id.
function openFreezerMap(f = "andreia") {
  const mine = placesIn(f);
  const nums = p => (norm(p.label).match(/\d/g) || []).map(Number);
  const isDoor = p => norm(p.label).includes("porta");
  // door: every door shelf whose numbers touch the block; inside: the shelf/drawer with that number
  const findDoor = ns => mine.filter(p => isDoor(p) && nums(p).some(n => ns.includes(n)));
  const findIn = (kind, n) => mine.filter(p => !isDoor(p) && norm(p.label).includes(kind) && nums(p)[0] === n).slice(0, 1);
  const info = h("p", { class: "fmap-info" }, "Toque numa prateleira para ver o que tem nela.");
  const count = n => n === 1 ? "1 comida" : `${n} comidas`;
  const slot = (cls, ps, label, inner) => {
    const lists = ps.map(p => [p, [...items.values()].filter(d => d.place === p.id)]);
    const total = lists.reduce((a, [, l]) => a + l.length, 0);
    const pick = () => {
      for (const b of document.querySelectorAll(".fslot")) b.classList.toggle("on", b === btn);
      info.textContent = "";
      if (!ps.length) { info.append(h("b", {}, label), " não está na aba Prateleiras."); return; }
      lists.forEach(([p, list], i) => {
        if (i) info.append(h("br"));
        info.append(h("b", {}, p.label + ": "), list.length
          ? list.map(d => d.name + (d.unknown ? "" : ` (${(d.units || []).length})`)).join(", ")
          : "vazia.");
      });
    };
    const btn = h("button", { type: "button", class: "fslot " + cls, onclick: pick },
      inner || null, h("b", {}, label), h("small", {}, ps.length ? (total ? count(total) : "vazia") : ""));
    return btn;
  };
  // one plain square per block of door shelves
  const doorBlock = ns => {
    const b = slot("block", findDoor(ns), ns.map(n => `${n}ª`).join(ns.length > 2 ? ", " : " e ").replace(/, (\d)ª$/, " e $1ª"));
    b.style.flexGrow = ns.length;   // taller block for more shelves; together they fill the door
    return b;
  };
  let map;
  if (f === "ze") {
    const z = (cls, id, inner) => {
      const p = mine.find(x => x.id === id);
      return slot(cls, p ? [p] : [], p?.label || ZE_PLACES.find(x => x.id === id).label, inner);
    };
    map = h("div", { class: "fmap one" }, h("div", { class: "fbody" },
      z("lid", "ze-p12", h("span", { class: "flap", "aria-hidden": "true" })),
      z("shelf tall", "ze-p34"),
      z("drawer thin", "ze-gp"),
      z("shelf", "ze-p5"),
      ["ze-g1", "ze-g2", "ze-g3"].map(id => z("drawer", id))));
  } else {
    const door = h("div", { class: "fdoor" },
      h("span", { class: "fcap" }, "Porta"),
      doorBlock([1, 2]),
      h("div", { class: "fdisp", "aria-hidden": "true" }, "gelo e água"),
      doorBlock([3, 4, 5]));
    const body = h("div", { class: "fbody" },
      h("span", { class: "fcap" }, "Dentro"),
      h("div", { class: "fice", "aria-hidden": "true" }, "máquina de gelo"),
      [1, 2, 3].map(n => slot("shelf", findIn("prateleira", n), `${n}ª Prateleira`)),
      [1, 2].map(n => slot("drawer", findIn("gaveta", n), `${n}ª Gaveta`)));
    map = h("div", { class: "fmap" }, door, body);
  }
  showSheet(h("div", { class: "sheet" },
    h("h3", {}, fzLabel(f)),
    h("p", { class: "help" }, "Com a porta aberta, de cima para baixo."),
    map,
    info,
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: closeSheet }, "Fechar"))));
}

function alertBox() {
  const al = alerts();
  const total = al.bad.length + al.soon.length;
  if (!total) { alertOnly = false; return h("div", { class: "alertbox calm" }, h("span", { class: "pip ok" }), "Tudo dentro da validade"); }
  const parts = [];
  if (al.expired) parts.push(h("b", { class: "bad" }, al.expired === 1 ? "1 vencido" : `${al.expired} vencidos`));
  const redLeft = al.bad.length - al.expired;
  if (redLeft) parts.push(h("b", { class: "bad" }, redLeft === 1 ? "1 para usar logo" : `${redLeft} para usar logo`));
  if (al.soon.length) parts.push(h("b", { class: "soon" }, al.soon.length === 1 ? "1 passou da metade" : `${al.soon.length} passaram da metade`));
  const line = parts;
  return h("button", {
    type: "button", class: "alertbox" + (al.bad.length ? " hot" : "") + (alertOnly ? " on" : ""), "aria-pressed": String(alertOnly),
    onclick: () => { alertOnly = !alertOnly; render(); window.scrollTo(0, 0); },
  }, h("span", { class: "pip " + (al.bad.length ? "bad" : "soon") }), h("span", { class: "line" }, line),
     h("span", { class: "go" }, alertOnly ? "Ver tudo" : "Ver"));
}

// How many foods (in stock) each group has right now.
function groupCounts() {
  const count = {};
  for (const [id, it] of items) {
    if (!(isUnknown(id) || unitsOf(id).length > 0)) continue;
    const c = categoryOf(it);
    count[c] = (count[c] || 0) + 1;
  }
  return count;
}

function setCatFilter(id) { catFilter = id; closeSheet(); render(); window.scrollTo(0, 0); }

// Filter button: a sheet with the food groups that are in the freezers right now.
function openFilterSheet() {
  const count = groupCounts();
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  const cats = CATEGORIES.filter(c => count[c.id] || c.id === catFilter);
  const tile = (id, icon, label, n) => h("button", {
    type: "button", class: "gtile", "aria-pressed": String(catFilter === id), onclick: () => setCatFilter(id),
  }, h("i", { "aria-hidden": "true" }, icon), h("span", {}, label), h("small", {}, n === 1 ? "1 comida" : `${n} comidas`));
  showSheet(h("div", { class: "sheet" },
    h("h3", {}, "Filtrar por tipo"),
    h("p", { class: "help" }, "Mostra só esse tipo de comida, dos dois freezers."),
    cats.length
      ? h("div", { class: "gtiles" }, tile(null, "🍽️", "Tudo", total), cats.map(c => tile(c.id, c.icon, c.label, count[c.id] || 0)))
      : h("p", {}, "O freezer está vazio."),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: closeSheet }, "Fechar"))));
}
$("#filterBtn").addEventListener("click", openFilterSheet);

function renderFreezer() {
  const list = $("#list");
  const q = norm($("#q").value);
  const all = [...items.entries()].map(([id, d]) => ({ id, ...d }));

  if (ready.items && ready.places) {
    $("#alertSlot").replaceChildren(alertBox());
    $("#fzSlot").replaceChildren(alertOnly || q || catFilter ? "" : fzSwitch());
  }

  const al = alerts();
  const alertIds = new Set([...al.bad, ...al.soon].map(a => a.id));
  const filtering = !!q || alertOnly || !!catFilter;
  // The name contains the text ("le" finds Lentilha, Pele de frango…). A food group only counts from 4 letters and
  // at the start of one of its words ("legu" → Legumes e verduras), so "fe" doesn't bring every bean.
  const catHit = it => q.length >= 4 && norm(catById(categoryOf(it)).label).split(/\s+/).some(w => w.startsWith(q));
  const matchQ = it => norm(it.name).includes(q) || catHit(it);
  const shown = all.filter(it => (!q || matchQ(it)) && (!alertOnly || alertIds.has(it.id))
    && (!catFilter || categoryOf(it) === catFilter));

  const ans = $("#answer");
  ans.textContent = "";
  ans.hidden = !(q && ready.items);
  const fb = $("#filterBtn"), fi = $("#filterIcon");
  fb.classList.toggle("on", !!catFilter);
  fi.hidden = !catFilter; fi.textContent = catFilter ? catById(catFilter).icon : "";
  fb.setAttribute("aria-label", catFilter ? `Filtro: ${catById(catFilter).label}. Toque para trocar` : "Filtrar por tipo de comida");
  if (catFilter && !q && ready.items) {
    const c = catById(catFilter);
    const inStock = shown.filter(i => isUnknown(i.id) || unitsOf(i.id).length > 0);
    ans.hidden = false;
    if (!inStock.length) ans.textContent = `Não tem ${c.label.toLowerCase()} no freezer agora.`;
    else ans.append(`${c.icon} ${c.label}: ${inStock.length === 1 ? "1 comida" : inStock.length + " comidas"} em `,
      h("b", {}, [...new Set(inStock.map(i => placeFull(i.place)))].join(", ")));
    ans.append(" ", h("button", { class: "linkbtn", type: "button", onclick: () => setCatFilter(null) }, "Ver tudo"));
  }
  if (q && ready.items) {
    if (!shown.length) ans.textContent = alertOnly ? "Nenhuma comida vencendo com esse nome." : "Não achei isso no freezer.";
    // A few foods: say where each one is. Many: just how many, the shelves below show them.
    else if (shown.length <= 3) shown.forEach((i, k) => { if (k) ans.append(h("br")); ans.append(h("b", {}, i.name), ` está na ${placeFull(i.place)}`); });
    else ans.append(h("b", {}, `${shown.length} comidas`), ` com “${$("#q").value.trim()}”, nas prateleiras abaixo`);
  }

  if (!ready.items || !ready.places) return;
  list.textContent = "";
  if (!filtering && !placesIn(fz).length) {
    list.append(h("div", { class: "state" }, h("strong", {}, `${fzLabel(fz)} ainda não tem prateleiras`),
      "Crie as prateleiras e gavetas dele para começar a guardar comida aqui.",
      h("a", { class: "btn primary", href: "#prateleiras" }, "Criar prateleiras")));
    return;
  }
  // Searching or filtering looks in both freezers; otherwise just the chosen one.
  const ordered = FREEZERS.flatMap(f => placesIn(f.id));
  const sections = filtering ? ordered : placesIn(fz);
  const orphan = all.filter(i => !places.find(p => p.id === i.place));
  if (orphan.length && (filtering || fz === "andreia")) sections.push({ id: "__none", label: "Sem lugar" });
  for (const p of sections) {
    let its = shown.filter(i => p.id === "__none" ? !places.find(x => x.id === i.place) : i.place === p.id);
    its = alertOnly
      ? its.sort((a, b) => itemExpiry(a.id, a).left - itemExpiry(b.id, b).left)
      : its.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (filtering && !its.length) continue;
    const total = its.filter(i => isUnknown(i.id) || unitsOf(i.id).length > 0).length;
    const count = total === 1 ? "1 item" : `${total} itens`;
    const sec = h("section", { class: "place" },
      h("h2", {}, p.label, h("small", {}, filtering && p.id !== "__none" ? `${fzShort(fzOf(p))} · ${count}` : count)));
    if (!its.length) sec.append(h("div", { class: "empty-place" }, "Vazio"));
    else sec.append(h("ul", {}, its.map(itemRow)));
    list.append(sec);
  }
  if (filtering && !list.children.length && !q) list.append(h("div", { class: "state" }, h("strong", {}, "Nada vencendo")));
}

function itemRow(it) {
  const units = sortUnits(unitsOf(it.id));
  const n = units.length;
  const unknown = isUnknown(it.id);
  const out = !unknown && n === 0;
  const dated = units.filter(u => u != null);
  const oldest = dated[0];
  const exp = out ? null : unitExpiry(it, oldest);
  const low = !unknown && it.min != null && n < it.min;

  const tags = [];
  if (unknown) tags.push(h("i", { class: "tag" }, "conferir quantidade"));
  if (exp && exp.expired) tags.push(h("i", { class: "tag bad" }, exp.text));
  if (low) tags.push(h("i", { class: "tag info" }, "na lista de compras"));

  let meta = "";
  if (out) meta = "acabou";
  else if (!unknown && n) {
    meta = !dated.length ? "sem data de entrada"
      : n === 1 ? `colocado ${ago(oldest)}`
      : units[0] == null ? `mais antigo: sem data · último: ${ago(units[n - 1])}`
      : `mais antigo: ${ago(oldest)}`;
  }
  const expText = exp && !exp.expired ? h("em", { class: "exp " + exp.level }, exp.text) : null;

  const row = h("li", { class: "item" + (out ? " out" : "") },
    h("button", { class: "name", type: "button", onclick: () => openItemSheet(it.id), "aria-label": `Editar ${it.name}` },
      h("span", { class: exp && exp.level !== "ok" ? "lvl-" + exp.level : null },
        h("i", { class: "cat", title: catById(categoryOf(it)).label, "aria-hidden": "true" }, catById(categoryOf(it)).icon), it.name),
      tags.length ? h("div", { class: "tags" }, tags) : null,
      expText,
      meta ? h("em", {}, meta) : null,
      it.note ? h("em", {}, it.note) : null),
  );
  if (out && it.min == null) row.append(h("button", { class: "rm", type: "button", onclick: () => removeItem(it.id) }, "Tirar da lista"));
  row.append(h("div", { class: "step" },
    h("button", { type: "button", "aria-label": `Tirar um ${it.name} (o mais antigo)`, onclick: () => bump(it.id, -1), disabled: out ? true : null }, "−"),
    h("span", { class: "qty" + (unknown ? " unknown" : "") }, unknown ? "?" : n),
    h("button", { type: "button", "aria-label": `Colocar mais um ${it.name}`, onclick: () => bump(it.id, 1) }, "+")));
  return row;
}

/* ---------- item writes ---------- */

function bump(id, delta) {
  if (!items.get(id)) return;
  if (isUnknown(id)) { openItemSheet(id); return; }   // set real count with dates first
  const u = sortUnits(unitsOf(id));
  if (delta > 0) u.push(Date.now());
  else if (u.length) u.shift();                       // the oldest one goes out
  const p = pending[id] || (pending[id] = {});
  p.units = u;
  clearTimeout(p.timer);
  p.timer = setTimeout(() => flush(id), 600);         // one write per pause in tapping
  render();
}

function flush(id) {
  const p = pending[id];
  if (!p) return;
  delete pending[id];
  const it = items.get(id);
  if (it) {
    const d = p.units.length - (Array.isArray(it.units) ? it.units.length : 0);
    if (d) logEvent(d > 0 ? "add" : "take", it, id, it.place, Math.abs(d));
  }
  // optimistic: keep showing the new value until the snapshot arrives
  if (it) items.set(id, { ...it, units: p.units, unknown: false });
  store.update("items", id, { units: p.units, unknown: false, updatedAt: Date.now() }).catch(fail);
  if (it) syncShopping(id, { ...it, unknown: false }, p.units.length);
  render();
}

function removeItem(id) {
  const it = items.get(id);
  if (it) logEvent("del", it, id, it.place, 0);
  store.del("items", id).catch(fail);
  toast("Removido da lista");
}

/* ---------- autocomplete for food names ---------- */

// Suggestions: foods already in the freezers and on the shopping list first, then the long list in foods.js.
function nameSuggestions(text, limit = 6) {
  const q = cleanName(text);
  if (!q) return [];
  const seen = new Set();
  const out = [];
  const add = (name, rank, it) => {
    const key = cleanName(name);
    if (!key || seen.has(key) || key === q) return;
    let score;
    if (key.startsWith(q)) score = 0;
    else if (key.split(" ").some(w => w.startsWith(q))) score = 1;
    else return;
    seen.add(key);
    out.push({ name, score, rank, it, len: name.length });
  };
  // the freezer on screen first, so picking a food fills in its shelf there
  const mine = [...items.values()].sort((a, b) => (itemFz(b) === fz) - (itemFz(a) === fz));
  for (const it of mine) add(it.name, 0, it);
  for (const [, sh] of shopping) add(sh.name, 1, null);
  for (const f of FOODS) add(f, 2, null);
  out.sort((a, b) => a.score - b.score || a.rank - b.rank || a.len - b.len || a.name.localeCompare(b.name, "pt-BR"));
  return out.slice(0, limit);
}

// Wraps an input with a dropdown of suggestions. onPick(name, existingItem|null) runs after the input is filled.
function withSuggest(input, onPick) {
  const box = h("div", { class: "suggest", role: "listbox", hidden: true });
  const wrap = h("div", { class: "suggest-wrap" }, input, box);
  const hide = () => { box.hidden = true; box.textContent = ""; };
  const draw = () => {
    const list = nameSuggestions(input.value);
    box.textContent = "";
    if (!list.length || document.activeElement !== input) { hide(); return; }
    for (const s of list) {
      const c = catById(categoryOf(s.it || { name: s.name }));
      const t = s.it ? foodTotal(s.it.name) : null;
      box.append(h("button", {
        type: "button", role: "option", class: "sg",
        onpointerdown: e => e.preventDefault(),   // keep the keyboard open
        onclick: () => { input.value = s.name; hide(); input.dispatchEvent(new Event("input")); onPick && onPick(s.name, s.it); },
      }, h("i", { "aria-hidden": "true" }, c.icon), h("span", {}, s.name),
         t ? h("small", {}, `já tem ${totalText(t)} · ${placesText(t.where)}`) : null));
    }
    box.hidden = false;
  };
  input.setAttribute("autocomplete", "off");
  input.addEventListener("input", e => { if (e.isTrusted) draw(); });
  input.addEventListener("focus", draw);
  input.addEventListener("blur", () => setTimeout(hide, 150));
  input.addEventListener("keydown", e => { if (e.key === "Escape" && !box.hidden) { e.stopPropagation(); hide(); } });
  return wrap;
}

/* ---------- sheets ---------- */

function closeSheet() { $("#sheetRoot").textContent = ""; }
function showSheet(form) {
  const veil = h("div", { class: "veil", onclick: e => { if (e.target === veil) closeSheet(); } }, form);
  closeSheet();
  $("#sheetRoot").append(veil);
}
const field = (label, control, help) => h("label", { class: "f" }, h("span", { class: "lbl" }, label), control, help ? h("span", { class: "help" }, help) : null);

function shelfSelect(value) {
  const sel = h("select", { id: "f-shelf" });
  for (const [v, label] of SHELF_OPTIONS) {
    const o = h("option", { value: v == null ? "" : String(v) }, label);
    if ((value ?? null) === v) o.selected = true;
    sel.append(o);
  }
  return sel;
}

// opts (adding only): { name, place, shelfMonths, min, fromShop } — used by "Guardar" on the shopping list.
function openItemSheet(id, opts = {}) {
  const editing = id ? items.get(id) : null;
  if (id && !editing) return;
  if (!editing && !opts.place && !placesIn(fz).length) { toast(`Crie uma prateleira no ${fzLabel(fz)} primeiro.`); location.hash = "#prateleiras"; return; }
  if (!places.length) { toast("Crie uma prateleira primeiro."); location.hash = "#prateleiras"; return; }
  if (pending[id]) { clearTimeout(pending[id].timer); flush(id); }

  let place = editing?.place || (opts.place && places.find(p => p.id === opts.place) ? opts.place : placesIn(fz)[0]?.id || places[0].id);
  let units = editing ? sortUnits(unitsOf(id)) : [];
  let unknown = editing ? !!editing.unknown : false;
  let armed = false;

  const nameIn = h("input", { type: "text", id: "f-name", value: editing?.name || opts.name || "", placeholder: "Ex: Peito de frango", autocomplete: "off" });
  const shelfSel = shelfSelect(editing ? editing.shelfMonths : "shelfMonths" in opts ? opts.shelfMonths : 3);
  const minIn = h("input", { type: "number", id: "f-min", inputmode: "numeric", min: "1", max: "999", value: editing?.min ?? opts.min ?? "", placeholder: "Não avisar" });
  // Category: "" = guess from the name (shown live), or one picked by hand.
  const catSel = h("select", { id: "f-cat" });
  const autoOpt = h("option", { value: "" });
  catSel.append(autoOpt, ...CATEGORIES.map(c => h("option", { value: c.id }, `${c.icon} ${c.label}`)));
  catSel.value = editing?.cat || opts.cat || "";
  const drawAuto = () => { const g = catById(guessCategory(nameIn.value)); autoOpt.textContent = `${g.icon} ${g.label} (automático)`; };

  // Suggested freezer time from the category. New foods follow it until someone picks a time by hand.
  let shelfTouched = !!editing || "shelfMonths" in opts;
  const shelfHelp = h("span", { class: "help" });
  const suggest = () => {
    drawAuto();
    const name = nameIn.value.trim();
    if (!name) { shelfHelp.textContent = ""; return; }
    const c = catById(catSel.value || guessCategory(name));
    const m = suggestMonths(name, catSel.value || null);
    const label = SHELF_OPTIONS.find(([v]) => v === m)?.[1] || `${m} meses`;
    shelfHelp.textContent = `Sugerido para ${c.icon} ${c.label}: ${label}`;
    if (!shelfTouched) { shelfSel.value = String(m); shelfSel.dispatchEvent(new Event("change")); }
  };
  nameIn.addEventListener("input", suggest);
  catSel.addEventListener("change", suggest);
  const noteIn = h("input", { type: "text", id: "f-note", value: editing?.note || "", placeholder: "Opcional (ex: porção de 500 g)", autocomplete: "off" });

  const chips = h("div", { class: "chipgroups" });
  const drawChips = () => {
    chips.textContent = "";
    for (const f of FREEZERS) {
      const ps = placesIn(f.id);
      if (!ps.length) continue;
      chips.append(h("div", { class: "chipgroup" }, h("small", {}, f.label),
        h("div", { class: "chips", role: "group", "aria-label": f.label }, ps.map(p => h("button", {
          class: "chip", type: "button", "aria-pressed": String(p.id === place), onclick: () => { place = p.id; drawChips(); },
        }, p.label)))));
    }
  };
  drawChips();

  // entries (one per package, with the date it went in)
  const shelfNow = () => (shelfSel.value === "" ? null : Number(shelfSel.value));
  const unitList = h("ul", { class: "units" });
  const drawUnits = () => {
    unitList.textContent = "";
    if (!units.length) {
      unitList.append(h("li", { class: "none" }, unknown ? "Quantidade desconhecida. Adicione as entradas abaixo." : "Nenhuma entrada. Adicione abaixo."));
      return;
    }
    units.forEach((ts, i) => {
      const e = unitExpiry({ shelfMonths: shelfNow() }, ts);
      unitList.append(h("li", {},
        h("div", {},
          h("span", {}, ts == null ? "Data desconhecida" : `Entrou em ${fmtDate(ts)}`),
          e ? h("small", { class: e.level === "ok" ? "" : e.level }, `${e.text} (${fmtDate(e.date)})`) : ts != null ? h("small", {}, ago(ts)) : null),
        h("button", { class: "x", type: "button", "aria-label": "Tirar esta entrada", onclick: () => { units.splice(i, 1); drawUnits(); } }, "×")));
    });
  };
  shelfSel.addEventListener("change", drawUnits);
  shelfSel.addEventListener("change", e => { if (e.isTrusted) shelfTouched = true; });

  const addN = h("input", { type: "number", id: "f-n", inputmode: "numeric", min: "1", max: "50", value: "1", "aria-label": "Quantos" });
  const addDate = h("input", { type: "date", id: "f-date", value: todayInput(), max: todayInput(), "aria-label": "Data que entrou" });
  const addUnits = () => {
    const n = Math.min(50, Math.max(1, parseInt(addN.value, 10) || 1));
    const ts = addDate.value ? fromInput(addDate.value) : Date.now();
    for (let i = 0; i < n; i++) units.push(ts);
    units = sortUnits(units);
    unknown = false;
    addN.value = "1";
    drawUnits();
  };

  const save = ev => {
    ev.preventDefault();
    const name = nameIn.value.trim();
    if (!name) { nameIn.focus(); toast("Escreva o nome da comida."); return; }
    const minRaw = parseInt(minIn.value, 10);
    const min = Number.isFinite(minRaw) && minRaw > 0 ? Math.min(999, minRaw) : null;
    const shelfMonths = shelfNow();
    const note = noteIn.value.trim();
    const cat = catSel.value || null;
    // Picked a category by hand: remember it for this food name (shared with the whole family).
    if (cat) {
      const key = cleanName(name);
      const known = { ...(lastLearned || {}) };
      let changed = false;
      const learn = k => { if (k && known[k] !== cat) { known[k] = cat; changed = true; } };
      // A food the app didn't recognise at all: also learn its first word ("Kombu desidratado" teaches "kombu").
      if (guessCategory(name) === "outros") {
        const first = key.split(" ")[0];
        if (first.length >= 3) learn(first);
      }
      learn(key);
      if (changed) { lastLearned = known; setLearned(known); store.set("meta", "cats", { map: known }).catch(() => {}); }
    }
    const now = Date.now();

    if (editing) {
      const doc = { name, place, units, unknown: unknown && units.length === 0, shelfMonths, min, note, cat, addedAt: editing.addedAt ?? null, updatedAt: now };
      const before = Array.isArray(editing.units) ? editing.units.length : 0;
      if (editing.unknown && units.length) logEvent("count", doc, id, place, units.length);
      else if (units.length !== before) logEvent(units.length > before ? "add" : "take", doc, id, place, Math.abs(units.length - before));
      if (place !== editing.place) logEvent("move", doc, id, place, 0);
      store.set("items", id, doc).catch(fail);
      items.set(id, doc);
      syncShopping(id, doc, units.length);
      toast("Salvo");
    } else {
      const n = Math.min(50, Math.max(0, parseInt(addN.value, 10) || 0));
      const ts = addDate.value ? fromInput(addDate.value) : now;
      const fresh = Array(n).fill(ts);
      // From the shopping list: take the bought entry off first; syncShopping puts it back if still below the minimum.
      if (opts.fromShop) { shopping.delete(opts.fromShop); store.del("shopping", opts.fromShop).catch(fail); }
      const kind = opts.fromShop ? "bought" : "add";
      // Same food on the same shelf? Add to it instead of making a duplicate.
      const same = [...items.entries()].find(([, d]) => d.place === place && norm(d.name) === norm(name));
      if (same) {
        const [sid, sd] = same;
        const merged = sortUnits([...(Array.isArray(sd.units) ? sd.units : []), ...fresh]);
        const doc = { ...sd, units: merged, unknown: false, shelfMonths: shelfMonths ?? sd.shelfMonths ?? null, min: min ?? sd.min ?? null, cat: cat ?? sd.cat ?? null, updatedAt: now };
        if (note) doc.note = note;
        store.set("items", sid, doc).catch(fail);
        if (n) logEvent(kind, doc, sid, place, n);
        syncShopping(sid, doc, merged.length);
        toast(opts.fromShop ? `${sd.name} guardado (${merged.length}) e tirado da lista` : `Somado ao ${sd.name} que já tinha (${merged.length})`);
      } else {
        const nid = newId(name);
        const doc = { name, place, units: fresh, unknown: false, shelfMonths, min, note, cat, addedAt: now, updatedAt: now };
        store.set("items", nid, doc).catch(fail);
        logEvent(opts.fromShop ? "bought" : "new", doc, nid, place, n);
        syncShopping(nid, doc, n);
        toast(opts.fromShop ? `${name} guardado na ${placeFull(place)} e tirado da lista` : `${name} na ${placeFull(place)}`);
      }
    }
    closeSheet();
  };

  const delBtn = editing ? h("button", {
    class: "btn danger", type: "button", onclick: e => {
      if (!armed) { armed = true; e.currentTarget.classList.add("armed"); e.currentTarget.textContent = "Toque de novo para remover"; return; }
      removeItem(id); closeSheet();
    },
  }, "Remover do freezer") : null;

  const form = h("form", { class: "sheet", onsubmit: save },
    h("h3", {}, editing ? "Editar comida" : opts.fromShop ? "Guardar no freezer" : "Colocar no freezer"),
    field("Comida", editing ? nameIn : withSuggest(nameIn, (name, it) => {
      // An existing food: put the new packages where it already is, with its settings.
      if (!it) return;
      if (places.find(p => p.id === it.place)) { place = it.place; drawChips(); }
      if (it.shelfMonths != null) { shelfSel.value = it.shelfMonths == null ? "" : String(it.shelfMonths); shelfTouched = true; suggest(); }
      if (it.min != null && !minIn.value) minIn.value = it.min;
      if (it.cat) { catSel.value = it.cat; suggest(); }
    })),
    field("Tipo", catSel),
    h("div", { class: "f" }, h("span", { class: "lbl" }, "Onde"), chips),
    editing
      ? h("div", { class: "f" }, h("span", { class: "lbl" }, "Entradas (uma por pacote)"), unitList,
          h("span", { class: "help" }, "Ao tirar com o −, sai sempre a mais antiga."),
          h("div", { class: "addunit" }, addN, addDate, h("button", { class: "btn", type: "button", onclick: addUnits }, "+ Entrada")))
      : h("div", { class: "two" }, field("Quantidade", addN), field("Data que entrou", addDate)),
    h("div", { class: "two" },
      field("Validade no freezer", shelfSel),
      field("Comprar quando tiver menos de", minIn)),
    shelfHelp,
    field("Observação", noteIn),
    h("div", { class: "row" },
      h("button", { class: "btn", type: "button", onclick: closeSheet }, "Cancelar"),
      h("button", { class: "btn primary", type: "submit" }, editing ? "Salvar" : opts.fromShop ? "Guardar" : "Adicionar")),
    delBtn ? h("div", { class: "row" }, delBtn) : null,
  );
  suggest();
  if (editing) drawUnits();
  showSheet(form);
  if (!editing) setTimeout(() => nameIn.focus(), 50);
}

/* ---------- shopping tab ---------- */

function renderShopping() {
  const box = $("#shopList");
  if (!ready.shopping) return;
  box.textContent = "";
  const all = [...shopping.entries()].map(([id, d]) => ({ id, ...d }));
  const open = all.filter(s => !s.done).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  const done = all.filter(s => s.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

  if (!all.length) {
    box.append(h("div", { class: "state" }, h("strong", {}, "Nada para comprar"),
      "Escreva acima o que precisa, ou defina em cada comida “Comprar quando tiver menos de” para ela entrar aqui sozinha."));
    return;
  }
  if (open.length) {
    box.append(h("ul", { class: "card" }, open.map(shopRow)));
    box.append(h("div", { class: "share" },
      h("button", { class: "btn wa", type: "button", onclick: () => shareList(open, "whatsapp") }, waIcon(), "Enviar no WhatsApp"),
      navigator.share ? h("button", { class: "btn", type: "button", onclick: () => shareList(open, "share") }, "Outro app") : null));
  }
  else box.append(h("div", { class: "state" }, h("strong", {}, "Tudo comprado"), "Nada pendente na lista."));
  if (done.length) {
    box.append(h("div", { class: "subhead" }, h("h2", {}, `Comprados (${done.length})`),
      h("button", { class: "ghost", type: "button", onclick: clearDone }, "Limpar comprados")));
    box.append(h("ul", { class: "card" }, done.map(shopRow)));
  }
}

function shopRow(s) {
  const it = s.itemId ? items.get(s.itemId) : null;
  const name = it?.name || s.name;
  let sub = null;
  if (s.auto && it && !s.done) {
    const t = foodTotal(it.name);
    sub = `automático · tem ${totalText(t)}, mínimo ${it.min ?? "-"} · ${placesText(t.where)}`;
  } else if (s.auto && !s.done) sub = "automático";
  const toggle = () => store.update("shopping", s.id, s.done ? { done: false, doneAt: DELETE } : { done: true, doneAt: Date.now() }).catch(fail);
  return h("li", { class: "shop" + (s.done ? " done" : "") },
    h("button", { class: "tick", type: "button", "aria-pressed": String(!!s.done), "aria-label": s.done ? `Desmarcar ${name}` : `Marcar ${name} como comprado`, onclick: toggle },
      h("span", { "aria-hidden": "true" }, svgCheck())),
    h("button", { class: "what", type: "button", onclick: toggle }, h("span", {}, name), sub ? h("small", {}, sub) : null),
    s.done ? h("button", { class: "store", type: "button", onclick: () => storeFromShop(s) }, "Guardar") : null,
    h("button", { class: "x", type: "button", "aria-label": `Tirar ${name} da lista`, onclick: () => store.del("shopping", s.id).catch(fail) }, "×"));
}

function svgCheck() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
  svg.append(p);
  return svg;
}

// Shopping list as a plain message, e.g. for someone at the market who doesn't use the app.
function shareList(open, how) {
  const lines = open.map(s => `• ${(s.itemId && items.get(s.itemId)?.name) || s.name}`);
  const text = ["🛒 Lista de compras", "", ...lines, "", "— Freezerino"].join("\n");
  if (how === "share" && navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
}

function waIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", "M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.8l4.6-1.2A8.7 8.7 0 1 0 12 3.2zm4.9 12.3c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a14 14 0 0 1-5.6-4.6c-.8-1-1.2-2.2-1.2-3.1 0-1 .5-1.6.8-1.8.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2z");
  svg.append(p);
  return svg;
}

// A bought item arrived home: open "Guardar no freezer" already filled in; saving takes it off the list.
function storeFromShop(s) {
  let it = s.itemId ? items.get(s.itemId) : null;
  if (!it) {
    // manual entry: same food already in a freezer? use its shelf and settings (prefer the freezer on screen)
    const same = [...items.values()].filter(d => norm(d.name) === norm(s.name));
    it = same.find(d => itemFz(d) === fz) || same[0] || null;
  }
  openItemSheet(null, {
    name: it?.name || s.name, place: it?.place, fromShop: s.id,
    ...(it ? { shelfMonths: it.shelfMonths ?? null, min: it.min ?? null, cat: it.cat ?? null } : {}),
  });
}

function clearDone() {
  const ops = [...shopping.entries()].filter(([, s]) => s.done).map(([id]) => ({ op: "del", c: "shopping", id }));
  if (ops.length) store.batch(ops).then(() => toast("Lista limpa")).catch(fail);
}

// shopping input gets the same name suggestions
{ const inp = $("#shopIn"), slot = $("#shopInSlot"); slot.append(withSuggest(inp, () => $("#shopForm").requestSubmit())); }

$("#shopForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#shopIn").value.trim();
  if (!name) return;
  const dup = [...shopping.values()].find(s => !s.done && norm(s.name) === norm(name));
  if (dup) { toast("Já está na lista"); $("#shopIn").value = ""; return; }
  store.set("shopping", newId(name), { name, done: false, auto: false, addedAt: Date.now() }).catch(fail);
  $("#shopIn").value = "";
});

/* ---------- shelves tab ---------- */

function renderPlaces() {
  const box = $("#placeList");
  if (!ready.places) return;
  box.textContent = "";
  box.append(fzSwitch());
  const mine = placesIn(fz);
  if (mine.length) {
    box.append(h("ul", { class: "card" }, mine.map((p, i) => {
      const count = [...items.values()].filter(it => it.place === p.id).length;
      let armed = false;
      return h("li", { class: "placerow" },
        h("button", { class: "what", type: "button", onclick: () => openPlaceSheet(p.id), "aria-label": `Renomear ${p.label}` },
          h("span", {}, p.label), h("small", {}, count === 1 ? "1 comida" : `${count} comidas`)),
        h("button", { class: "x", type: "button", "aria-label": `Subir ${p.label}`, disabled: i === 0 ? true : null, onclick: () => movePlace(i, -1) }, "↑"),
        h("button", { class: "x", type: "button", "aria-label": `Descer ${p.label}`, disabled: i === mine.length - 1 ? true : null, onclick: () => movePlace(i, 1) }, "↓"),
        h("button", {
          class: "x", type: "button", "aria-label": `Excluir ${p.label}`, onclick: e => {
            if (count) { toast(`Tire ou mova as ${count} comidas de “${p.label}” antes de excluir.`); return; }
            if (!armed) { armed = true; e.currentTarget.textContent = "✓"; e.currentTarget.style.color = "var(--danger)"; toast("Toque no ✓ para confirmar"); return; }
            store.del("places", p.id).catch(fail);
          },
        }, "×"));
    })));
  } else {
    box.append(h("div", { class: "state" }, h("strong", {}, `${fzLabel(fz)} sem prateleiras`), "Crie a primeira prateleira ou gaveta dele."));
  }
  box.append(h("button", { class: "btn primary addplace", type: "button", onclick: () => openPlaceSheet(null) }, "+ Nova prateleira ou gaveta"));
}

function movePlace(i, dir) {
  const mine = placesIn(fz);
  const a = mine[i], b = mine[i + dir];
  if (!a || !b) return;
  // normalise orders (within this freezer) so swapping always works
  const ops = mine.map((p, k) => {
    let order = k + 1;
    if (k === i) order = i + dir + 1;
    else if (k === i + dir) order = i + 1;
    return { op: "update", c: "places", id: p.id, data: { order } };
  });
  store.batch(ops).catch(fail);
}

function openPlaceSheet(id) {
  const editing = id ? places.find(p => p.id === id) : null;
  const nameIn = h("input", { type: "text", id: "f-place", value: editing?.label || "", placeholder: "Ex: Porta do freezer", autocomplete: "off", maxlength: "40" });
  const save = e => {
    e.preventDefault();
    const label = nameIn.value.trim();
    if (!label) { nameIn.focus(); return; }
    if (editing) store.update("places", id, { label }).catch(fail);
    else store.set("places", newId(label), { label, order: (placesIn(fz).at(-1)?.order ?? 0) + 1, freezer: fz }).catch(fail);
    closeSheet();
    toast(editing ? "Renomeado" : `${label} criada`);
  };
  showSheet(h("form", { class: "sheet", onsubmit: save },
    h("h3", {}, editing ? "Renomear" : `Nova prateleira no ${fzLabel(fz)}`),
    field("Nome", nameIn),
    h("div", { class: "row" },
      h("button", { class: "btn", type: "button", onclick: closeSheet }, "Cancelar"),
      h("button", { class: "btn primary", type: "submit" }, editing ? "Salvar" : "Criar"))));
  setTimeout(() => nameIn.focus(), 50);
}

/* ---------- who is using this phone + history ---------- */

const me = () => lsGet("who") || "Alguém";

function logEvent(kind, it, itemId, place, n) {
  if (!it) return;
  const at = Date.now();
  store.set("log", `${at}-${Math.random().toString(36).slice(2, 7)}`, {
    at, who: me(), kind, item: it.name, itemId, n, place: placeFull(place),
  }).catch(e => console.warn("log", e));
}

function askWho() {
  if ($("#sheetRoot").children.length) { setTimeout(askWho, 1500); return; }   // don't cover another sheet
  const cur = lsGet("who") || "";
  const other = h("input", { type: "text", id: "f-who", value: PEOPLE.includes(cur) ? "" : cur, placeholder: "Outro nome", autocomplete: "off", maxlength: "40" });
  const pick = name => {
    name = name.trim().slice(0, 40);
    if (!name) { other.focus(); return; }
    lsSet("who", name);
    if (!lsGet("deviceName")) lsSet("deviceName", name);
    closeSheet(); render(); toast(`Olá, ${name}!`);
  };
  showSheet(h("form", { class: "sheet", onsubmit: e => { e.preventDefault(); pick(other.value); } },
    h("h3", {}, "Quem usa este celular?"),
    h("p", { class: "help" }, "Aparece no histórico de quem colocou e tirou cada comida."),
    h("div", { class: "chips" }, PEOPLE.map(p => h("button", { class: "chip", type: "button", "aria-pressed": String(cur === p), onclick: () => pick(p) }, p))),
    h("div", { class: "addunit who" }, other, h("button", { class: "btn primary", type: "submit" }, "Sou eu"))));
}

// [text before the food name, text after it]
const KIND_TEXT = {
  add: n => [`colocou ${n}`, ""], take: n => [`tirou ${n}`, ""], new: n => [n ? `colocou ${n}` : "criou", " (nova)"],
  bought: n => [`guardou ${n}`, " (comprado)"], count: n => ["contou", `: tem ${n}`], del: () => ["apagou", " da lista"],
  move: () => ["mudou", " para"],
};

function dayLabel(ts) {
  const d = daysBetween(ts, Date.now());
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  return new Date(ts).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function renderLog() {
  const people = [...new Set(log.map(e => e.who))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (logWho && !people.includes(logWho)) logWho = null;
  const chip = (label, val) => h("button", { class: "chip", type: "button", "aria-pressed": String(logWho === val), onclick: () => { logWho = val; render(); } }, label);
  $("#logFilter").replaceChildren(
    h("div", { class: "logtop" },
      people.length > 1 ? h("div", { class: "chips" }, chip("Todos", null), people.map(p => chip(p, p))) : h("span"),
      h("button", { class: "ghost", type: "button", onclick: askWho }, `Você: ${me()}`)));

  const box = $("#logList");
  box.textContent = "";
  const shown = log.filter(e => !logWho || e.who === logWho);
  if (!shown.length) {
    box.append(h("div", { class: "state" }, h("strong", {}, "Nada no histórico ainda"),
      "Cada vez que alguém coloca, tira ou guarda uma comida, aparece aqui com o nome e a hora."));
    return;
  }
  let day = null, ul = null;
  for (const e of shown) {
    const dl = dayLabel(e.at);
    if (dl !== day) {
      day = dl;
      box.append(h("h2", { class: "logday" }, dl));
      ul = h("ul", { class: "card" });
      box.append(ul);
    }
    const [what, after] = (KIND_TEXT[e.kind] || (() => [e.kind, ""]))(e.n);
    const time = new Date(e.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    ul.append(h("li", { class: "logrow " + (e.kind === "take" || e.kind === "del" ? "out" : "in") },
      h("span", { class: "sign", "aria-hidden": "true" }, e.kind === "take" || e.kind === "del" ? "−" : e.kind === "move" || e.kind === "count" ? "•" : "+"),
      h("div", {},
        h("span", {}, h("b", {}, e.who), ` ${what} `, h("b", {}, e.item), after, e.kind === "move" ? ` ${e.place}` : ""),
        h("small", {}, e.kind === "move" || !e.place ? time : `${time} · ${e.place}`))));
  }
}

/* ---------- expiry notifications ---------- */

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
function deviceId() {
  let id = lsGet("deviceId");
  if (!id) { id = "d-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); lsSet("deviceId", id); }
  return id;
}
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function pushState() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return isIOS && !standalone ? "home" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  return lsGet("pushOn") && Notification.permission === "granted" ? "on" : "off";
}

async function enablePush(name) {
  if (!store.pushReady) throw new Error("not-configured");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("denied");
  const reg = await swReady;
  if (!reg) throw new Error("no-sw");
  const token = await store.pushToken(reg);
  if (!token) throw new Error("unsupported");
  await store.set("devices", deviceId(), { token, name: name.slice(0, 40), ua: navigator.userAgent.slice(0, 200), updatedAt: Date.now() });
  lsSet("pushOn", "1"); lsSet("pushToken", token); lsSet("deviceName", name);
}

async function disablePush() {
  await store.del("devices", deviceId()).catch(() => {});
  await store.dropPushToken();
  lsSet("pushOn", null); lsSet("pushToken", null);
}

// Push addresses can change; keep this phone's one up to date (quietly) every time the app opens.
async function refreshPush() {
  if (store.demo || pushState() !== "on" || !store.pushReady) return;
  try {
    const reg = await swReady;
    const token = reg && await store.pushToken(reg);
    if (token && token !== lsGet("pushToken")) {
      await store.set("devices", deviceId(), { token, name: lsGet("deviceName") || "Celular", ua: navigator.userAgent.slice(0, 200), updatedAt: Date.now() });
      lsSet("pushToken", token);
    }
  } catch (e) { console.warn("push refresh", e); }
}

function openBellSheet() {
  const st = pushState();
  const nameIn = h("input", { type: "text", id: "f-dev", value: lsGet("deviceName") || lsGet("who") || "", placeholder: "Ex: Celular da Andréia", autocomplete: "off", maxlength: "40" });
  const others = [...devices.entries()].filter(([id]) => id !== deviceId()).map(([, d]) => d.name || "Celular");
  const msg = h("p", { class: "help" });
  const body = [];

  if (st === "home") {
    body.push(h("p", {}, "No iPhone, os avisos só funcionam pelo ícone na tela inicial. Abra o Freezerino pelo ícone (não pelo Safari) e toque no sino de novo."));
  } else if (st === "unsupported") {
    body.push(h("p", {}, "Este navegador não recebe avisos. No Android use o Chrome; no iPhone, o ícone na tela inicial (iOS 16.4 ou mais novo)."));
  } else if (st === "blocked") {
    body.push(h("p", {}, "Os avisos estão bloqueados para o Freezerino neste celular. Libere em Ajustes do celular → Notificações → Freezerino (ou nas configurações do site no Chrome) e volte aqui."));
  } else if (st === "on") {
    body.push(h("p", {}, h("b", {}, "Ativado neste celular"), ` (${lsGet("deviceName") || "Celular"}).`));
    body.push(h("div", { class: "row" },
      h("button", { class: "btn", type: "button", onclick: async () => {
        const reg = await swReady;
        if (reg) reg.showNotification("Freezerino", { body: "Teste: os avisos estão funcionando neste celular.", icon: "icons/icon-192.png", tag: "freezerino-test" });
        else toast("Não consegui mostrar o teste.");
      } }, "Mostrar um teste"),
      h("button", { class: "btn danger", type: "button", onclick: async () => { await disablePush(); closeSheet(); render(); toast("Avisos desativados neste celular"); } }, "Desativar")));
  } else {
    body.push(field("Nome deste celular", nameIn, "Para saber quem recebe os avisos."));
    body.push(h("div", { class: "row" },
      h("button", { class: "btn primary", type: "button", onclick: async e => {
        const btn = e.currentTarget;
        const name = nameIn.value.trim() || "Celular";
        btn.disabled = true; btn.textContent = "Ativando…"; msg.textContent = "";
        try { await enablePush(name); closeSheet(); render(); toast("Avisos ativados neste celular"); }
        catch (err) {
          btn.disabled = false; btn.textContent = "Ativar avisos";
          const m = err && err.message;
          msg.textContent = m === "denied" ? "Você não permitiu os avisos. Se mudar de ideia, libere nas configurações do celular."
            : m === "not-configured" ? "Os avisos ainda não foram configurados no Firebase."
            : "Não consegui ativar. Confira a internet e tente de novo.";
          console.warn("push", err);
        }
      } }, "Ativar avisos")));
  }

  showSheet(h("div", { class: "sheet" },
    h("h3", {}, "Avisos de validade"),
    h("p", { class: "help" }, "Todo dia às 9h o Freezerino confere os dois freezers e avisa quando uma comida passa da metade da validade, fica perto de vencer ou vence."),
    ...body, msg,
    others.length ? h("p", { class: "help" }, `Também recebem: ${others.join(", ")}.`) : null,
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: closeSheet }, "Fechar"))));
}
$("#bell").addEventListener("click", openBellSheet);

/* ---------- misc ---------- */

document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
$("#q").addEventListener("input", render);
$("#add").addEventListener("click", () => openItemSheet(null));
// refresh "há X dias" texts when coming back to the app
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
