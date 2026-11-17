package com.nkoindustries.freezerino.data

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MetadataChanges
import com.google.firebase.firestore.Query
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await

/**
 * Everything the screens show, kept live from Firestore (which also keeps an offline copy on the phone),
 * plus every write. Same behaviour as app.js on the website.
 */
class Store(private val ctx: Context) {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()
    val prefs = ctx.getSharedPreferences("freezerino", Context.MODE_PRIVATE)
    private val main = Handler(Looper.getMainLooper())

    // ---- live data ----
    var signedIn by mutableStateOf(auth.currentUser != null); private set
    var items by mutableStateOf<Map<String, Item>>(emptyMap()); private set
    var places by mutableStateOf<List<Place>>(emptyList()); private set
    var shopping by mutableStateOf<Map<String, ShopEntry>>(emptyMap()); private set
    var log by mutableStateOf<List<LogEntry>>(emptyList()); private set
    var devices by mutableStateOf<Map<String, String>>(emptyMap()); private set   // id -> name
    var learned by mutableStateOf<Map<String, String>>(emptyMap()); private set
    var ready by mutableStateOf(false); private set
    var status by mutableStateOf("Conectando…"); private set
    var synced by mutableStateOf(false); private set
    var loginNote by mutableStateOf<String?>(null)

    // ---- this phone ----
    var fz by mutableStateOf(prefs.getString("fz", "andreia")!!.let { v -> if (FREEZERS.any { it.id == v }) v else "andreia" })
        private set
    var who by mutableStateOf(prefs.getString("who", null)); private set

    fun setFreezer(id: String) { fz = id; prefs.edit().putString("fz", id).apply() }
    fun chooseWho(name: String) {
        who = name
        prefs.edit().putString("who", name).apply()
        if (prefs.getString("deviceName", null) == null) prefs.edit().putString("deviceName", name).apply()
    }
    val me get() = who ?: "Alguém"

    // taps on +/− are collected and written once per pause (like the website)
    val pending = mutableStateMapOf<String, List<Long?>>()
    private val pendingTimers = HashMap<String, Runnable>()

    // events the screen shows as a short message
    var toast by mutableStateOf<String?>(null)
    fun say(msg: String) { toast = msg }
    private val fail: (Exception) -> Unit = { say("Não consegui salvar. Confira a internet e tente de novo.") }

    private val subs = mutableListOf<ListenerRegistration>()
    private val onceDone = HashSet<String>()

    init {
        auth.addAuthStateListener { a ->
            val on = a.currentUser != null
            signedIn = on
            if (on) start() else stop()
        }
    }

    // ---------------- auth ----------------

    suspend fun signIn(pw: String): String? = try {
        auth.signInWithEmailAndPassword(FAMILY_EMAIL, pw).await(); loginNote = null; null
    } catch (e: Exception) {
        val code = (e as? FirebaseAuthException)?.errorCode ?: ""
        when {
            code.contains("TOO_MANY", true) || e.message?.contains("blocked", true) == true ->
                "Muitas tentativas. Espere alguns minutos e tente de novo."
            e is com.google.firebase.FirebaseNetworkException -> "Sem internet. Confira a conexão."
            else -> "Senha errada. Tente de novo."
        }
    }

    fun signOut() = auth.signOut()

    // ---------------- listeners ----------------

    private fun start() {
        if (subs.isNotEmpty()) return
        status = "Conectando…"; synced = false
        val timeout = Runnable { if (!synced) status = "Sem conexão: mostrando a última lista salva" }
        main.postDelayed(timeout, 10_000)
        val onErr: (FirebaseFirestoreException) -> Unit = { e ->
            if (e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) {
                loginNote = "A senha da família mudou. Entre com a senha nova."
                signOut()
            } else status = "Não consegui carregar a lista"
        }
        subs += db.collection("items").addSnapshotListener(MetadataChanges.INCLUDE) { s, e ->
            if (e != null) { onErr(e); return@addSnapshotListener }
            s ?: return@addSnapshotListener
            items = s.documents.associate { it.id to Item.from(it.id, it.data ?: emptyMap()) }
            ready = true
            if (!s.metadata.isFromCache) {
                synced = true; status = "Sincronizado com a família"
                once("migrate") { migrate() }
            }
        }
        subs += db.collection("places").addSnapshotListener(MetadataChanges.INCLUDE) { s, e ->
            if (e != null) { onErr(e); return@addSnapshotListener }
            s ?: return@addSnapshotListener
            places = s.documents.map { Place.from(it.id, it.data ?: emptyMap()) }.sortedBy { it.order }
            if (!s.metadata.isFromCache) once("places") { seedPlaces() }
        }
        subs += db.collection("shopping").addSnapshotListener { s, e ->
            if (e != null) { onErr(e); return@addSnapshotListener }
            shopping = s?.documents?.associate { it.id to ShopEntry.from(it.id, it.data ?: emptyMap()) } ?: emptyMap()
        }
        subs += db.collection("devices").addSnapshotListener { s, _ ->
            devices = s?.documents?.associate { it.id to (it.getString("name") ?: "Celular") } ?: emptyMap()
        }
        subs += db.collection("meta").addSnapshotListener { s, _ ->
            @Suppress("UNCHECKED_CAST")
            val map = (s?.documents?.firstOrNull { it.id == "cats" }?.get("map") as? Map<String, String>) ?: emptyMap()
            learned = map
            Categories.setLearned(map)
        }
        subs += db.collection("log").orderBy("at", Query.Direction.DESCENDING).limit(300).addSnapshotListener { s, _ ->
            log = s?.documents?.map { LogEntry.from(it.id, it.data ?: emptyMap()) }?.sortedByDescending { it.at } ?: emptyList()
        }
        refreshPush()
    }

    private fun stop() {
        subs.forEach { it.remove() }; subs.clear()
        items = emptyMap(); places = emptyList(); shopping = emptyMap(); log = emptyList(); devices = emptyMap()
        ready = false; onceDone.clear()
    }

    private fun once(key: String, fn: () -> Unit) { if (onceDone.add(key)) fn() }

    /** Shelves were fixed in code at first; create them once. Freezer Zé gets its own when it has none. */
    private fun seedPlaces() {
        val metaRef = db.collection("meta")
        if (places.isEmpty()) metaRef.document("places").get().addOnSuccessListener { d ->
            if (d.exists() || places.isNotEmpty()) return@addOnSuccessListener
            val b = db.batch()
            DEFAULT_PLACES.forEach { b.set(db.collection("places").document(it.id), mapOf("label" to it.label, "order" to it.order)) }
            b.set(metaRef.document("places"), mapOf("at" to System.currentTimeMillis()))
            b.commit()
        }
        if (placesIn("ze").isEmpty()) metaRef.document("placesZe").get().addOnSuccessListener { d ->
            if (d.exists() || placesIn("ze").isNotEmpty()) return@addOnSuccessListener
            val b = db.batch()
            ZE_PLACES.forEach {
                b.set(db.collection("places").document(it.id), mapOf("label" to it.label, "order" to it.order, "freezer" to "ze"))
            }
            b.set(metaRef.document("placesZe"), mapOf("at" to System.currentTimeMillis()))
            b.commit()
        }
    }

    /** Very old format had a plain "qty"; turn it into one dated entry per package. */
    private fun migrate() {
        val b = db.batch()
        var n = 0
        db.collection("items").get().addOnSuccessListener { snap ->
            for (d in snap.documents) {
                if (d.get("units") is List<*>) continue
                val it = Item.from(d.id, d.data ?: emptyMap())
                b.update(d.reference, mapOf(
                    "units" to it.units, "unknown" to it.unknown, "shelfMonths" to it.shelfMonths, "min" to it.min,
                    "qty" to FieldValue.delete(), "check" to FieldValue.delete(), "updatedAt" to System.currentTimeMillis(),
                ))
                n++
            }
            if (n > 0) b.commit()
        }
    }

    // ---------------- lookups ----------------

    fun placesIn(f: String) = places.filter { it.freezer == f }
    fun place(id: String?) = places.firstOrNull { it.id == id }
    fun itemFz(it: Item) = place(it.place)?.freezer ?: "andreia"
    /** "2ª Gaveta (Zé)" */
    fun placeFull(id: String?): String = place(id)?.let { "${it.label} (${freezerShort(it.freezer)})" } ?: "Sem lugar"

    fun unitsOf(id: String): List<Long?> = pending[id] ?: items[id]?.units ?: emptyList()
    fun isUnknown(id: String) = items[id]?.unknown == true && !pending.containsKey(id)

    /** Expiry of an item = its oldest dated package (the next one to go out). */
    fun itemExpiry(it: Item): Expiry? {
        if (isUnknown(it.id)) return null
        val oldest = sortUnits(unitsOf(it.id)).firstOrNull { u -> u != null } ?: return null
        return unitExpiry(it.shelfMonths, oldest)
    }

    data class Alert(val id: String, val e: Expiry, val f: String)
    data class Alerts(val bad: List<Alert>, val soon: List<Alert>) { val expired get() = bad.count { it.e.expired } }

    fun alerts(): Alerts {
        val bad = ArrayList<Alert>(); val soon = ArrayList<Alert>()
        for (it in items.values) {
            val e = itemExpiry(it) ?: continue
            if (unitsOf(it.id).isEmpty()) continue
            when (e.level) { Level.BAD -> bad += Alert(it.id, e, itemFz(it)); Level.SOON -> soon += Alert(it.id, e, itemFz(it)); else -> {} }
        }
        return Alerts(bad, soon)
    }

    data class Total(val n: Int, val unknown: Boolean, val where: List<String>) {
        val text get() = if (unknown) (if (n > 0) "$n+?" else "?") else n.toString()
    }

    /** One food across every shelf of both freezers. over = a change not saved yet. */
    fun foodTotal(name: String, over: Triple<String, Item, Int>? = null): Total {
        val key = norm(name)
        var n = 0; var unknown = false
        val where = ArrayList<String>()
        for (d in items.values) {
            if (norm(d.name) != key || (over != null && d.id == over.first)) continue
            if (isUnknown(d.id)) unknown = true else n += unitsOf(d.id).size
            where += d.place
        }
        if (over != null) { n += over.third; where += over.second.place }
        return Total(n, unknown, where)
    }

    /** "1ª Prateleira (Andréia)", "1ª Prateleira e 3ª Prateleira (Andréia)" or "3 lugares" */
    fun placesText(where: List<String>): String {
        val ids = where.distinct()
        if (ids.size <= 1) return placeFull(ids.firstOrNull())
        val ps = ids.map { place(it) }
        val fzs = ps.map { it?.freezer }.toSet()
        if (ps.any { it == null } || fzs.size > 1 || ids.size > 3) return "${ids.size} lugares"
        val labels = ps.filterNotNull().sortedBy { it.order }.map { it.label }
        return "${labels.dropLast(1).joinToString(", ")} e ${labels.last()} (${freezerShort(fzs.first()!!)})"
    }

    // ---------------- item writes ----------------

    fun bump(id: String, delta: Int) {
        if (items[id] == null) return
        val u = sortUnits(unitsOf(id)).toMutableList()
        if (delta > 0) u += System.currentTimeMillis() else if (u.isNotEmpty()) u.removeAt(0)   // oldest goes out
        pending[id] = u
        pendingTimers[id]?.let { main.removeCallbacks(it) }
        val r = Runnable { flush(id) }
        pendingTimers[id] = r
        main.postDelayed(r, 600)
    }

    fun flush(id: String) {
        pendingTimers.remove(id)?.let { main.removeCallbacks(it) }
        val units = pending[id] ?: return
        val it = items[id]
        if (it != null) {
            val d = units.size - it.units.size
            if (d != 0) logEvent(if (d > 0) "add" else "take", it.name, id, it.place, kotlin.math.abs(d))
            items = items + (id to it.copy(units = units, unknown = false))
        }
        pending.remove(id)
        db.collection("items").document(id)
            .update(mapOf("units" to units, "unknown" to false, "updatedAt" to System.currentTimeMillis()))
            .addOnFailureListener(fail)
        if (it != null) syncShopping(id, it.copy(unknown = false), units.size)
    }

    fun removeItem(id: String) {
        items[id]?.let { logEvent("del", it.name, id, it.place, 0) }
        db.collection("items").document(id).delete().addOnFailureListener(fail)
        say("Removido da lista")
    }

    /** Saves the add/edit sheet. Returns the message to show. */
    fun saveItem(editing: Item?, name: String, place: String, units: List<Long?>, unknown: Boolean, shelfMonths: Int?,
                 min: Int?, note: String, cat: String?, addN: Int, addDate: Long, fromShop: String?) {
        if (cat != null) learnCategory(name, cat)
        val now = System.currentTimeMillis()
        val items = db.collection("items")
        if (editing != null) {
            val doc = editing.copy(name = name, place = place, units = units, unknown = unknown && units.isEmpty(),
                shelfMonths = shelfMonths, min = min, note = note, cat = cat)
            val before = editing.units.size
            if (editing.unknown && units.isNotEmpty()) logEvent("count", name, editing.id, place, units.size)
            else if (units.size != before) logEvent(if (units.size > before) "add" else "take", name, editing.id, place, kotlin.math.abs(units.size - before))
            if (place != editing.place) logEvent("move", name, editing.id, place, 0)
            items.document(editing.id).set(doc.toMap(now)).addOnFailureListener(fail)
            this.items = this.items + (editing.id to doc)
            syncShopping(editing.id, doc, units.size)
            say("Salvo")
            return
        }
        val fresh = List(addN) { addDate as Long? }
        if (fromShop != null) {
            shopping = shopping - fromShop
            db.collection("shopping").document(fromShop).delete().addOnFailureListener(fail)
        }
        val kind = if (fromShop != null) "bought" else "add"
        // same food on the same shelf: add to it instead of making a duplicate
        val same = this.items.values.firstOrNull { it.place == place && norm(it.name) == norm(name) }
        if (same != null) {
            val merged = sortUnits(same.units + fresh)
            val doc = same.copy(units = merged, unknown = false, shelfMonths = shelfMonths ?: same.shelfMonths,
                min = min ?: same.min, cat = cat ?: same.cat, note = note.ifEmpty { same.note })
            items.document(same.id).set(doc.toMap(now)).addOnFailureListener(fail)
            if (addN > 0) logEvent(kind, doc.name, same.id, place, addN)
            syncShopping(same.id, doc, merged.size)
            say(if (fromShop != null) "${same.name} guardado (${merged.size}) e tirado da lista" else "Somado ao ${same.name} que já tinha (${merged.size})")
        } else {
            val nid = newId(name)
            val doc = Item(nid, name, place, fresh, false, shelfMonths, min, note, cat, now)
            items.document(nid).set(doc.toMap(now)).addOnFailureListener(fail)
            logEvent(if (fromShop != null) "bought" else "new", name, nid, place, addN)
            syncShopping(nid, doc, addN)
            say(if (fromShop != null) "$name guardado na ${placeFull(place)} e tirado da lista" else "$name na ${placeFull(place)}")
        }
    }

    /** Category picked by hand: remember it for this food name (shared with the family). */
    private fun learnCategory(name: String, cat: String) {
        val key = Categories.clean(name)
        val known = learned.toMutableMap()
        var changed = false
        fun learn(k: String) { if (k.isNotEmpty() && known[k] != cat) { known[k] = cat; changed = true } }
        if (Categories.guess(name) == "outros") key.split(" ").first().let { if (it.length >= 3) learn(it) }
        learn(key)
        if (changed) {
            learned = known
            Categories.setLearned(known)
            db.collection("meta").document("cats").set(mapOf("map" to known))
        }
    }

    // ---------------- shopping ----------------

    /**
     * After a count changes: put the food on the shopping list when the total (all shelves) is under its minimum,
     * take it off again (if not ticked yet) when there's enough. One automatic entry per food.
     */
    fun syncShopping(id: String, item: Item, count: Int) {
        if (item.unknown) return
        val key = norm(item.name)
        val group = listOf(item.copy(id = id)) + items.values.filter { it.id != id && norm(it.name) == key }
        val t = foodTotal(item.name, Triple(id, item, count))
        val withMin = group.filter { it.min != null }
        val owner = withMin.firstOrNull()?.id
        val col = db.collection("shopping")
        for (g in group) {
            val s = shopping["auto-${g.id}"]
            if (g.id != owner && s != null && !s.done) col.document("auto-${g.id}").delete().addOnFailureListener(fail)
        }
        if (owner == null) return
        val min = withMin.maxOf { it.min!! }
        val sid = "auto-$owner"
        val s = shopping[sid]
        if (!t.unknown && t.n < min) {
            if (s == null || s.done) col.document(sid).set(mapOf(
                "name" to item.name, "done" to false, "auto" to true, "itemId" to owner, "addedAt" to System.currentTimeMillis(),
            )).addOnFailureListener(fail)
        } else if (s != null && !s.done) col.document(sid).delete().addOnFailureListener(fail)
    }

    fun addShopping(name: String): Boolean {
        if (shopping.values.any { !it.done && norm(it.name) == norm(name) }) { say("Já está na lista"); return false }
        db.collection("shopping").document(newId(name))
            .set(mapOf("name" to name, "done" to false, "auto" to false, "addedAt" to System.currentTimeMillis()))
            .addOnFailureListener(fail)
        return true
    }

    fun toggleShopping(s: ShopEntry) {
        val upd: Map<String, Any> = if (s.done) mapOf("done" to false, "doneAt" to FieldValue.delete())
        else mapOf("done" to true, "doneAt" to System.currentTimeMillis())
        db.collection("shopping").document(s.id).update(upd).addOnFailureListener(fail)
    }

    fun deleteShopping(id: String) { db.collection("shopping").document(id).delete().addOnFailureListener(fail) }

    fun clearDone() {
        val done = shopping.values.filter { it.done }
        if (done.isEmpty()) return
        val b = db.batch()
        done.forEach { b.delete(db.collection("shopping").document(it.id)) }
        b.commit().addOnSuccessListener { say("Lista limpa") }.addOnFailureListener(fail)
    }

    // ---------------- shelves ----------------

    fun addPlace(label: String) {
        val order = (placesIn(fz).lastOrNull()?.order ?: 0.0) + 1
        db.collection("places").document(newId(label)).set(mapOf("label" to label, "order" to order, "freezer" to fz))
            .addOnFailureListener(fail)
        say("$label criada")
    }

    fun renamePlace(id: String, label: String) {
        db.collection("places").document(id).update("label", label).addOnFailureListener(fail)
        say("Renomeado")
    }

    fun deletePlace(id: String) { db.collection("places").document(id).delete().addOnFailureListener(fail) }

    fun movePlace(i: Int, dir: Int) {
        val mine = placesIn(fz)
        if (i + dir !in mine.indices) return
        val b = db.batch()
        mine.forEachIndexed { k, p ->
            val order = when (k) { i -> i + dir + 1; i + dir -> i + 1; else -> k + 1 }
            b.update(db.collection("places").document(p.id), "order", order)
        }
        b.commit().addOnFailureListener(fail)
    }

    // ---------------- history ----------------

    fun logEvent(kind: String, item: String, itemId: String, place: String, n: Int) {
        val at = System.currentTimeMillis()
        val id = "$at-" + (1..5).map { "abcdefghijklmnopqrstuvwxyz0123456789".random() }.joinToString("")
        db.collection("log").document(id).set(mapOf(
            "at" to at, "who" to me, "kind" to kind, "item" to item, "itemId" to itemId, "n" to n, "place" to placeFull(place),
        ))
    }

    // ---------------- notifications ----------------

    val deviceId: String get() = prefs.getString("deviceId", null) ?: run {
        val id = "a-" + (1..8).map { "abcdefghijklmnopqrstuvwxyz0123456789".random() }.joinToString("") + java.lang.Long.toString(System.currentTimeMillis(), 36)
        prefs.edit().putString("deviceId", id).apply(); id
    }
    var pushOn by mutableStateOf(prefs.getBoolean("pushOn", false)); private set

    suspend fun enablePush(name: String) {
        val token = FirebaseMessaging.getInstance().token.await()
        saveDevice(token, name)
        prefs.edit().putBoolean("pushOn", true).putString("pushToken", token).putString("deviceName", name).apply()
        pushOn = true
    }

    suspend fun disablePush() {
        runCatching { db.collection("devices").document(deviceId).delete().await() }
        runCatching { FirebaseMessaging.getInstance().deleteToken().await() }
        prefs.edit().putBoolean("pushOn", false).remove("pushToken").apply()
        pushOn = false
    }

    private fun saveDevice(token: String, name: String) =
        db.collection("devices").document(deviceId).set(mapOf(
            "token" to token, "name" to name.take(40),
            "ua" to "Android app · ${Build.MANUFACTURER} ${Build.MODEL} · Android ${Build.VERSION.RELEASE}".take(200),
            "updatedAt" to System.currentTimeMillis(),
        ))

    /** Push addresses can change; keep this phone's up to date every time the app opens. */
    fun refreshPush() {
        if (!pushOn) return
        FirebaseMessaging.getInstance().token.addOnSuccessListener { onNewToken(it) }
    }

    fun onNewToken(token: String) {
        if (!pushOn || auth.currentUser == null || token == prefs.getString("pushToken", null)) return
        saveDevice(token, prefs.getString("deviceName", null) ?: "Celular")
        prefs.edit().putString("pushToken", token).apply()
    }

    companion object {
        const val FAMILY_EMAIL = "familia@freezerino.app"
    }
}
