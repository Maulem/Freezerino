// Storage layer: Firebase in production, an in-memory fake for local testing (?demo on localhost).
import { SEED_ITEMS } from "./seed.js";

export const DELETE = Symbol("delete-field");

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
const V = "10.14.1";

export async function makeStore() {
  const demo = new URLSearchParams(location.search).has("demo")
    && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  return demo ? demoStore() : firebaseStore();
}

async function firebaseStore() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
  });
  const fix = data => {
    const out = {};
    for (const [k, v] of Object.entries(data)) out[k] = v === DELETE ? F.deleteField() : v;
    return out;
  };
  const ref = (c, id) => F.doc(db, c, id);
  return {
    demo: false,
    onAuth: cb => A.onAuthStateChanged(auth, cb),
    signIn: pw => A.signInWithEmailAndPassword(auth, FAMILY_EMAIL, pw),
    signOut: () => A.signOut(auth),
    listen(c, onData, onErr) {
      return F.onSnapshot(F.collection(db, c), { includeMetadataChanges: true }, snap => {
        const m = new Map();
        for (const d of snap.docs) m.set(d.id, d.data());
        onData(m, { fromCache: snap.metadata.fromCache });
      }, onErr);
    },
    async get(c, id) { const s = await F.getDoc(ref(c, id)); return s.exists() ? s.data() : null; },
    set: (c, id, data) => F.setDoc(ref(c, id), fix(data)),
    update: (c, id, data) => F.updateDoc(ref(c, id), fix(data)),
    del: (c, id) => F.deleteDoc(ref(c, id)),
    async batch(ops) {
      const b = F.writeBatch(db);
      for (const o of ops) {
        if (o.op === "set") b.set(ref(o.c, o.id), fix(o.data));
        else if (o.op === "update") b.update(ref(o.c, o.id), fix(o.data));
        else b.delete(ref(o.c, o.id));
      }
      return b.commit();
    },
  };
}

// In-memory store for testing. Starts with the paper list in the OLD format to exercise migration.
function demoStore() {
  const colls = { items: new Map(), places: new Map(), shopping: new Map(), meta: new Map() };
  const month = 30 * 86400000;
  for (const it of SEED_ITEMS) {
    const { id, ...d } = it;
    colls.items.set(id, { ...d, note: "", updatedAt: Date.now() });
  }
  // a couple of dated items to see expiry states
  colls.items.set("frango-teste", { name: "Frango inteiro", place: "g1", qty: 2, check: false, addedAt: Date.now() - 5 * month, updatedAt: Date.now() });
  colls.meta.set("seed", { at: Date.now() });
  const listeners = { items: [], places: [], shopping: [], meta: [] };
  const emit = c => setTimeout(() => {
    for (const l of listeners[c]) l(new Map([...colls[c]].map(([k, v]) => [k, structuredClone(v)])), { fromCache: false });
  }, 0);
  const apply = (c, id, data, merge) => {
    const cur = merge ? { ...(colls[c].get(id) || {}) } : {};
    if (merge && !colls[c].has(id)) throw new Error("not found");
    for (const [k, v] of Object.entries(data)) { if (v === DELETE) delete cur[k]; else cur[k] = structuredClone(v); }
    colls[c].set(id, cur);
  };
  let user = { uid: "demo" };
  let authCb = null;
  return {
    demo: true,
    onAuth: cb => { authCb = cb; setTimeout(() => cb(user), 0); },
    signIn: async () => { user = { uid: "demo" }; authCb && authCb(user); },
    signOut: async () => { user = null; authCb && authCb(null); },
    listen(c, onData) { listeners[c].push(onData); emit(c); return () => { listeners[c] = listeners[c].filter(x => x !== onData); }; },
    async get(c, id) { return colls[c].has(id) ? structuredClone(colls[c].get(id)) : null; },
    async set(c, id, d) { apply(c, id, d, false); emit(c); },
    async update(c, id, d) { apply(c, id, d, true); emit(c); },
    async del(c, id) { colls[c].delete(id); emit(c); },
    async batch(ops) {
      const touched = new Set();
      for (const o of ops) {
        if (o.op === "del") colls[o.c].delete(o.id); else apply(o.c, o.id, o.data, o.op === "update");
        touched.add(o.c);
      }
      touched.forEach(emit);
    },
  };
}
