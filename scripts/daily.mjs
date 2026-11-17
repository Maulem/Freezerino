// Runs once a day on GitHub Actions (see .github/workflows/daily.yml).
//  1. Expiry notifications: tells the family's phones when a food passes half of its freezer time,
//     gets under 20% (use soon) or expires. Each step is announced once per package.
//  2. Backup: writes every collection to JSON files in BACKUP_DIR (committed to the private backup repo).
//
// Env: FIREBASE_SERVICE_ACCOUNT (JSON, from a GitHub secret), MODE = "daily" | "test", BACKUP_DIR (optional).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MODE = process.env.MODE || "daily";
const APP_URL = "https://maulem.github.io/Freezerino/";
const FREEZERS = { andreia: "Andréia", ze: "Zé" };

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("FIREBASE_SERVICE_ACCOUNT secret is not set yet; nothing to do.");
  process.exit(0);
}
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const all = async c => Object.fromEntries((await db.collection(c).get()).docs.map(d => [d.id, d.data()]));

/* ---------- expiry (same rules as the app) ---------- */

const DAY = 86400000;
const addMonths = (ts, m) => { const d = new Date(ts); d.setMonth(d.getMonth() + m); return d.getTime(); };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const daysBetween = (a, b) => Math.floor((startOfDay(b) - startOfDay(a)) / DAY);
function inDays(d) {
  if (d < 0) { const a = -d; return a === 1 ? "venceu ontem" : a < 60 ? `vencido há ${a} dias` : `vencido há ${Math.floor(a / 30)} meses`; }
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  if (d < 21) return `vence em ${d} dias`;
  if (d < 60) return `vence em ${Math.floor(d / 7)} semanas`;
  return `vence em ${Math.floor(d / 30)} meses`;
}
// 0 ok, 1 past half, 2 under 20% left, 3 expired
function stage(it, now) {
  if (it.unknown || !it.shelfMonths || !Array.isArray(it.units)) return null;
  const dated = it.units.filter(u => u != null).sort((a, b) => a - b);
  if (!dated.length) return null;
  const ts = dated[0];
  const exp = addMonths(ts, it.shelfMonths);
  const days = daysBetween(now, exp);
  const left = (exp - now) / (exp - ts);
  const s = days < 0 ? 3 : left < 0.2 ? 2 : left < 0.5 ? 1 : 0;
  return { s, ts, days, text: inDays(days) };
}

/* ---------- push ---------- */

async function send(title, body, tag) {
  const devices = await all("devices");
  const entries = Object.entries(devices).filter(([, d]) => d.token);
  if (!entries.length) { console.log("No phones signed up for notifications."); return; }
  const res = await getMessaging().sendEach(entries.map(([, d]) => ({
    token: d.token,
    // data-only message: the website's service worker and the Android app (PushService) both show it themselves
    data: { title, body, tag, url: APP_URL + "#freezer" },
    android: { priority: "high", ttl: 86400 * 1000 },
    webpush: { headers: { Urgency: "high", TTL: "86400" }, data: { title, body, tag, url: APP_URL + "#freezer" } },
  })));
  const gone = [];
  res.responses.forEach((r, i) => {
    const [id, d] = entries[i];
    if (r.success) console.log(`sent to ${d.name || id}`);
    else {
      console.log(`failed for ${d.name || id}: ${r.error?.code}`);
      if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"].includes(r.error?.code)) gone.push(id);
    }
  });
  for (const id of gone) await db.collection("devices").doc(id).delete();
}

async function notifyExpiry(items, places) {
  const now = Date.now();
  const stateRef = db.collection("meta").doc("notify");
  const prev = (await stateRef.get()).data()?.items || {};
  const next = {};
  const news = [];
  for (const [id, it] of Object.entries(items)) {
    const st = stage(it, now);
    if (!st) continue;
    next[id] = { s: st.s, ts: st.ts };
    const p = prev[id];
    const before = p && p.ts === st.ts ? p.s : 0;   // a newer package becoming the oldest starts over
    if (st.s > before) news.push({ it, st });
  }
  await stateRef.set({ items: next, at: now });
  if (!news.length) { console.log("Nothing new to announce."); return; }

  news.sort((a, b) => b.st.s - a.st.s || a.st.days - b.st.days);
  const where = it => {
    const p = places[it.place];
    return p ? `${p.label} (${FREEZERS[p.freezer || "andreia"] || "freezer"})` : "";
  };
  const line = ({ it, st }) => `${it.name}: ${st.s === 1 ? "passou da metade, " : ""}${st.text}`;
  let title, body;
  if (news.length === 1) {
    const { it, st } = news[0];
    title = st.s === 3 ? `${it.name} venceu` : st.s === 2 ? `Usar logo: ${it.name}` : `${it.name} passou da metade da validade`;
    body = `${st.text[0].toUpperCase()}${st.text.slice(1)} · ${where(it)}`;
  } else {
    const hot = news.filter(n => n.st.s >= 2).length;
    title = hot ? `${news.length} comidas para olhar no freezer` : `${news.length} comidas passaram da metade da validade`;
    body = news.slice(0, 6).map(line).join("\n") + (news.length > 6 ? `\n+ ${news.length - 6} outras` : "");
  }
  console.log(title + "\n" + body);
  await send(title, body, "freezerino-expiry");
}

/* ---------- backup ---------- */

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object" && v.constructor === Object) return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]));
  if (v && typeof v.toMillis === "function") return v.toMillis();
  return v;
}

function backup(dir, data) {
  mkdirSync(dir, { recursive: true });
  for (const [name, docs] of Object.entries(data)) {
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(sortKeys(docs), null, 2) + "\n");
  }
  writeFileSync(join(dir, "README.md"),
    "# Freezerino backup\n\nDaily copy of the Freezerino Firestore data (items, places, shopping, meta).\n" +
    "One JSON file per collection, `{ docId: data }`. Git history keeps every earlier day.\n");
  console.log(`Backup written to ${dir}`);
}

/* ---------- history cleanup ---------- */

// Keep the "who took what" history for 6 months (older entries stay in the backup repo's git history).
async function pruneLog() {
  const cutoff = Date.now() - 183 * DAY;
  const old = await db.collection("log").where("at", "<", cutoff).get();
  for (let i = 0; i < old.docs.length; i += 400) {
    const b = db.batch();
    old.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
  if (old.size) console.log(`Removed ${old.size} history entries older than 6 months.`);
}

/* ---------- main ---------- */

if (MODE === "test") {
  await send("Freezerino", "Teste: os avisos de validade estão funcionando.", "freezerino-test");
} else {
  await pruneLog();
  const [items, places, shopping, meta, log] = await Promise.all(["items", "places", "shopping", "meta", "log"].map(all));
  if (process.env.BACKUP_DIR) backup(process.env.BACKUP_DIR, { items, places, shopping, meta, log });
  await notifyExpiry(items, places);
}
