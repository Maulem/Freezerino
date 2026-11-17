import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, getDoc, setDoc, updateDoc, deleteDoc, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { SEED_ITEMS } from "./seed.js";

// Public web config (safe to ship; access is enforced by firestore.rules).
const firebaseConfig = {
  apiKey: "AIzaSyAmja8wD70N52UCmX7Ly4dWKMxRkPBwtCE",
  authDomain: "freezerino-84f37.firebaseapp.com",
  projectId: "freezerino-84f37",
  storageBucket: "freezerino-84f37.firebasestorage.app",
  messagingSenderId: "496373551831",
  appId: "1:496373551831:web:d51578e616eb75e9835692",
};
// The single shared family account. The app only asks for its password.
const FAMILY_EMAIL = "familia@freezerino.app";

const PLACES = [
  { id: "p1", label: "1ª Prateleira" },
  { id: "p2", label: "2ª Prateleira" },
  { id: "p3", label: "3ª Prateleira" },
  { id: "g1", label: "1ª Gaveta" },
  { id: "g2", label: "2ª Gaveta" },
];
const placeLabel = id => (PLACES.find(p => p.id === id) || {}).label || "Sem lugar";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const items = new Map();   // id -> data
const pending = {};        // id -> { qty, timer }
let loaded = false;
let unsub = null;
let loadTimer = null;

const $ = s => document.querySelector(s);

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function toast(msg) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
function setStatus(text, ok) { $("#status").textContent = text; $("#dot").classList.toggle("ok", !!ok); }

/* ---------- login ---------- */

function show(view) {
  $("#bootView").hidden = true;
  $("#loginView").hidden = view !== "login";
  $("#appView").hidden = view !== "app";
  $("#add").hidden = view !== "app";
  if (view !== "app") $("#sheetRoot").textContent = "";
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pw = $("#pw").value;
  if (!pw) return;
  const btn = $("#loginBtn");
  btn.disabled = true; btn.textContent = "Entrando…";
  $("#loginErr").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, FAMILY_EMAIL, pw);
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

$("#logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) { show("app"); startData(); }
  else { stopData(); show("login"); setTimeout(() => $("#pw").focus(), 50); }
});

/* ---------- data ---------- */

function startData() {
  if (unsub) return;
  loaded = false;
  setStatus("Conectando…");
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => setStatus("Sem conexão: mostrando a última lista salva"), 10000);
  let seeded = false;
  unsub = onSnapshot(collection(db, "items"), { includeMetadataChanges: true }, snap => {
    for (const ch of snap.docChanges()) {
      if (ch.type === "removed") items.delete(ch.doc.id);
      else items.set(ch.doc.id, ch.doc.data());
    }
    loaded = true;
    if (!snap.metadata.fromCache) {
      clearTimeout(loadTimer);
      setStatus("Sincronizado com a família", true);
      if (!seeded) { seeded = true; seedOnce(); }
    }
    render();
  }, err => {
    clearTimeout(loadTimer);
    loaded = true;
    setStatus(err.code === "permission-denied" ? "Sem permissão para ver a lista" : "Não consegui carregar a lista");
    render();
  });
}

function stopData() {
  if (unsub) { unsub(); unsub = null; }
  items.clear();
}

// First run only: copy the paper list into the database, then mark it done.
async function seedOnce() {
  try {
    const marker = doc(db, "meta", "seed");
    if ((await getDoc(marker)).exists()) return;
    const batch = writeBatch(db);
    const now = Date.now();
    for (const it of SEED_ITEMS) {
      const { id, ...data } = it;
      batch.set(doc(db, "items", id), { ...data, note: "", updatedAt: now });
    }
    batch.set(marker, { at: now, count: SEED_ITEMS.length });
    await batch.commit();
  } catch (e) {
    console.warn("seed failed", e);
  }
}

/* ---------- render ---------- */

function qtyOf(id) {
  if (pending[id]) return pending[id].qty;
  const q = items.get(id)?.qty;
  return typeof q === "number" ? q : null;
}

function since(ts) {
  if (!ts) return "";
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d < 1) return "colocado hoje";
  if (d === 1) return "colocado ontem";
  if (d < 14) return `colocado há ${d} dias`;
  if (d < 60) return `colocado há ${Math.floor(d / 7)} semanas`;
  return `colocado há ${Math.floor(d / 30)} meses`;
}

function render() {
  const list = $("#list");
  const q = norm($("#q").value);
  const all = [...items.entries()].map(([id, d]) => ({ id, ...d }));
  const shown = all.filter(it => !q || norm(it.name).includes(q));

  const ans = $("#answer");
  ans.textContent = "";
  if (q && loaded) {
    if (!shown.length) ans.textContent = "Não achei isso no freezer.";
    else ans.append("Está na ", h("b", {}, [...new Set(shown.map(i => placeLabel(i.place)))].join(", ")));
  }

  if (!loaded) return;
  list.textContent = "";
  if (!all.length) {
    list.append(h("div", { class: "state" }, h("strong", {}, "O freezer está vazio"),
      "Toque em “+ Adicionar” para colocar a primeira comida."));
    return;
  }
  for (const p of PLACES) {
    const its = shown.filter(i => i.place === p.id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (q && !its.length) continue;
    const total = its.filter(i => (qtyOf(i.id) ?? 1) > 0).length;
    const sec = h("section", { class: "place" },
      h("h2", {}, p.label, h("small", {}, total === 1 ? "1 item" : `${total} itens`)));
    if (!its.length) sec.append(h("div", { class: "empty-place" }, "Vazio"));
    else sec.append(h("ul", {}, its.map(itemRow)));
    list.append(sec);
  }
}

function itemRow(it) {
  const qty = qtyOf(it.id);
  const out = qty === 0;
  const meta = out ? "acabou" : since(it.addedAt);
  const row = h("li", { class: "item" + (out ? " out" : "") },
    h("button", { class: "name", type: "button", onclick: () => openSheet(it.id), "aria-label": `Editar ${it.name}` },
      h("span", {}, it.name),
      it.check && !out ? h("i", { class: "tag" }, "conferir quantidade") : null,
      meta ? h("em", {}, meta) : null,
      it.note ? h("em", {}, it.note) : null),
  );
  if (out) row.append(h("button", { class: "rm", type: "button", onclick: () => removeItem(it.id) }, "Tirar da lista"));
  row.append(h("div", { class: "step" },
    h("button", { type: "button", "aria-label": `Menos ${it.name}`, onclick: () => bump(it.id, -1), disabled: out ? true : null }, "−"),
    h("span", { class: "qty" + (qty == null ? " unknown" : "") }, qty == null ? "?" : qty),
    h("button", { type: "button", "aria-label": `Mais ${it.name}`, onclick: () => bump(it.id, 1) }, "+")));
  return row;
}

/* ---------- writes ---------- */

function bump(id, delta) {
  const next = Math.max(0, (qtyOf(id) ?? 0) + delta);
  const p = pending[id] || (pending[id] = {});
  p.qty = next;
  clearTimeout(p.timer);
  p.timer = setTimeout(() => flush(id), 600);   // one write per pause in tapping
  render();
}

function flush(id) {
  const p = pending[id];
  if (!p) return;
  delete pending[id];
  // The local cache shows the change at once; Firestore sends it when online.
  updateDoc(doc(db, "items", id), { qty: p.qty, check: false, updatedAt: Date.now() })
    .catch(() => toast("Não consegui salvar. Tente de novo."));
}

function removeItem(id) {
  deleteDoc(doc(db, "items", id)).catch(() => toast("Não consegui remover. Tente de novo."));
  toast("Removido da lista");
}

function newId(name) {
  const base = norm(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";
  return base + "-" + Math.random().toString(36).slice(2, 6);
}

function openSheet(id) {
  const editing = id ? items.get(id) : null;
  let place = editing?.place || PLACES[0].id;
  let armed = false;
  const root = $("#sheetRoot");
  const close = () => { root.textContent = ""; };

  const nameIn = h("input", { type: "text", id: "f-name", value: editing?.name || "", placeholder: "Ex: Feijão preto", autocomplete: "off" });
  const qtyIn = h("input", { type: "number", id: "f-qty", inputmode: "numeric", min: "0", value: editing ? (qtyOf(id) ?? "") : 1 });
  const noteIn = h("input", { type: "text", id: "f-note", value: editing?.note || "", placeholder: "Opcional (ex: porção de 500 g)", autocomplete: "off" });
  const chips = h("div", { class: "chips", role: "group", "aria-label": "Onde" });
  const drawChips = () => {
    chips.textContent = "";
    for (const p of PLACES) chips.append(h("button", {
      class: "chip", type: "button", "aria-pressed": String(p.id === place),
      onclick: () => { place = p.id; drawChips(); },
    }, p.label));
  };
  drawChips();

  const save = ev => {
    ev.preventDefault();
    const name = nameIn.value.trim();
    if (!name) { nameIn.focus(); toast("Escreva o nome da comida."); return; }
    const raw = qtyIn.value.trim();
    const qty = raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
    const note = noteIn.value.trim();
    const fail = () => toast("Não consegui salvar. Tente de novo.");
    if (editing) {
      if (pending[id]) { clearTimeout(pending[id].timer); delete pending[id]; }
      setDoc(doc(db, "items", id), {
        ...editing, name, place, qty, note,
        check: qty == null ? !!editing.check : false, updatedAt: Date.now(),
      }).catch(fail);
      toast("Salvo");
    } else {
      setDoc(doc(db, "items", newId(name)), {
        name, place, qty, note, check: false, addedAt: Date.now(), updatedAt: Date.now(),
      }).catch(fail);
      toast(`${name} na ${placeLabel(place)}`);
    }
    close();
  };

  const delBtn = editing ? h("button", {
    class: "btn danger", type: "button", onclick: e => {
      if (!armed) { armed = true; e.currentTarget.classList.add("armed"); e.currentTarget.textContent = "Toque de novo para remover"; return; }
      removeItem(id); close();
    },
  }, "Remover") : null;

  const sheet = h("form", { class: "sheet", onsubmit: save },
    h("h3", {}, editing ? "Editar comida" : "Colocar no freezer"),
    h("label", { class: "f" }, h("span", { class: "lbl" }, "Comida"), nameIn),
    h("div", { class: "f" }, h("span", { class: "lbl" }, "Onde"), chips),
    h("label", { class: "f" }, h("span", { class: "lbl" }, "Quantidade (pacotes, potes…)"), qtyIn),
    h("label", { class: "f" }, h("span", { class: "lbl" }, "Observação"), noteIn),
    h("div", { class: "row" },
      h("button", { class: "btn", type: "button", onclick: close }, "Cancelar"),
      h("button", { class: "btn primary", type: "submit" }, editing ? "Salvar" : "Adicionar")),
    delBtn ? h("div", { class: "row" }, delBtn) : null,
  );
  const veil = h("div", { class: "veil", onclick: e => { if (e.target === veil) close(); } }, sheet);
  root.textContent = "";
  root.append(veil);
  if (!editing) setTimeout(() => nameIn.focus(), 50);
}

document.addEventListener("keydown", e => { if (e.key === "Escape") $("#sheetRoot").textContent = ""; });
$("#q").addEventListener("input", render);
$("#add").addEventListener("click", () => openSheet(null));
