package com.nkoindustries.freezerino.data

import java.text.Normalizer
import java.util.Calendar

/*
  Same Firestore data as the website:
  items/{id}    { name, place, units: [ms|null…], unknown, shelfMonths|null, min|null, note, cat|null, addedAt, updatedAt }
                one entry per package = the date it went in. "−" removes the oldest (nulls count as oldest).
  places/{id}   { label, order, freezer? }   freezer "andreia" (default) or "ze"
  shopping/{id} { name, done, auto, itemId?, addedAt, doneAt? }   automatic entries use id "auto-<itemId>"
  log/{id}      { at, who, kind, item, itemId, n, place }
  devices/{id}  { token, name, ua, updatedAt }
  meta/cats     { map: { cleaned name: categoryId } }
*/

data class Item(
    val id: String,
    val name: String,
    val place: String,
    val units: List<Long?>,
    val unknown: Boolean,
    val shelfMonths: Int?,
    val min: Int?,
    val note: String,
    val cat: String?,
    val addedAt: Long?,
) {
    fun toMap(now: Long): Map<String, Any?> = mapOf(
        "name" to name, "place" to place, "units" to units, "unknown" to unknown,
        "shelfMonths" to shelfMonths, "min" to min, "note" to note, "cat" to cat,
        "addedAt" to addedAt, "updatedAt" to now,
    )

    companion object {
        fun from(id: String, d: Map<String, Any?>): Item {
            val units = (d["units"] as? List<*>)?.map { (it as? Number)?.toLong() }
            val qty = (d["qty"] as? Number)?.toInt()
            return Item(
                id = id,
                name = d["name"] as? String ?: "",
                place = d["place"] as? String ?: "",
                // very old format had a plain qty number
                units = units ?: List(qty ?: 0) { (d["addedAt"] as? Number)?.toLong() },
                unknown = (d["unknown"] as? Boolean) ?: (units == null && qty == null),
                shelfMonths = (d["shelfMonths"] as? Number)?.toInt(),
                min = (d["min"] as? Number)?.toInt(),
                note = d["note"] as? String ?: "",
                cat = d["cat"] as? String,
                addedAt = (d["addedAt"] as? Number)?.toLong(),
            )
        }
    }
}

data class Place(val id: String, val label: String, val order: Double, val freezer: String) {
    companion object {
        fun from(id: String, d: Map<String, Any?>) = Place(
            id, d["label"] as? String ?: "", (d["order"] as? Number)?.toDouble() ?: 0.0, d["freezer"] as? String ?: "andreia",
        )
    }
}

data class ShopEntry(
    val id: String, val name: String, val done: Boolean, val auto: Boolean, val itemId: String?,
    val addedAt: Long, val doneAt: Long?,
) {
    companion object {
        fun from(id: String, d: Map<String, Any?>) = ShopEntry(
            id, d["name"] as? String ?: "", d["done"] as? Boolean ?: false, d["auto"] as? Boolean ?: false,
            d["itemId"] as? String, (d["addedAt"] as? Number)?.toLong() ?: 0, (d["doneAt"] as? Number)?.toLong(),
        )
    }
}

data class LogEntry(
    val id: String, val at: Long, val who: String, val kind: String, val item: String, val n: Int, val place: String,
) {
    companion object {
        fun from(id: String, d: Map<String, Any?>) = LogEntry(
            id, (d["at"] as? Number)?.toLong() ?: 0, d["who"] as? String ?: "", d["kind"] as? String ?: "",
            d["item"] as? String ?: "", (d["n"] as? Number)?.toInt() ?: 0, d["place"] as? String ?: "",
        )
    }
}

data class Freezer(val id: String, val label: String) {
    val short get() = label.removePrefix("Freezer ")
}

val FREEZERS = listOf(Freezer("andreia", "Freezer Andréia"), Freezer("ze", "Freezer Zé"))
fun freezerLabel(id: String) = FREEZERS.firstOrNull { it.id == id }?.label ?: "Freezer"
fun freezerShort(id: String) = freezerLabel(id).removePrefix("Freezer ")
val PEOPLE = listOf("Henrique", "Andréia", "Zé")

val SHELF_OPTIONS: List<Pair<Int?, String>> = listOf(
    null to "Sem validade", 1 to "1 mês", 2 to "2 meses", 3 to "3 meses", 4 to "4 meses",
    6 to "6 meses", 9 to "9 meses", 12 to "1 ano", 18 to "1 ano e meio", 24 to "2 anos",
)

data class SeedPlace(val id: String, val label: String, val order: Int)
val DEFAULT_PLACES = listOf(
    SeedPlace("p1", "1ª Prateleira", 1), SeedPlace("p2", "2ª Prateleira", 2), SeedPlace("p3", "3ª Prateleira", 3),
    SeedPlace("g1", "1ª Gaveta", 4), SeedPlace("g2", "2ª Gaveta", 5),
)
// Freezer Zé, top to bottom (photo of 2026-11-17).
val ZE_PLACES = listOf(
    SeedPlace("ze-p12", "1ª e 2ª Prateleira", 1), SeedPlace("ze-p34", "3ª e 4ª Prateleira", 2),
    SeedPlace("ze-gp", "Gaveta pequena", 3), SeedPlace("ze-p5", "5ª Prateleira", 4),
    SeedPlace("ze-g1", "1ª Gaveta", 5), SeedPlace("ze-g2", "2ª Gaveta", 6), SeedPlace("ze-g3", "3ª Gaveta", 7),
)

/* ---------- text helpers ---------- */

private val marks = Regex("\\p{Mn}+")
fun norm(s: String?): String = Normalizer.normalize(s ?: "", Normalizer.Form.NFD).replace(marks, "").lowercase().trim()

fun newId(name: String): String {
    val base = norm(name).replace(Regex("[^a-z0-9]+"), "-").trim('-').take(40).ifEmpty { "x" }
    return base + "-" + (1..4).map { "abcdefghijklmnopqrstuvwxyz0123456789".random() }.joinToString("")
}

/* ---------- dates and expiry (same rules as the website and the daily job) ---------- */

const val DAY = 86_400_000L

fun addMonths(ts: Long, m: Int): Long = Calendar.getInstance().apply { timeInMillis = ts; add(Calendar.MONTH, m) }.timeInMillis
fun startOfDay(ts: Long): Long = Calendar.getInstance().apply {
    timeInMillis = ts; set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
}.timeInMillis
fun daysBetween(a: Long, b: Long): Int = Math.floorDiv(startOfDay(b) - startOfDay(a), DAY).toInt()

fun ago(ts: Long, now: Long = System.currentTimeMillis()): String {
    val d = daysBetween(ts, now)
    return when {
        d <= 0 -> "hoje"
        d == 1 -> "ontem"
        d < 14 -> "há $d dias"
        d < 60 -> "há ${d / 7} semanas"
        else -> { val m = d / 30; if (m < 24) "há $m meses" else "há ${m / 12} anos" }
    }
}

fun inDays(d: Int): String = when {
    d < 0 -> { val a = -d; if (a == 1) "venceu ontem" else if (a < 60) "vencido há $a dias" else "vencido há ${a / 30} meses" }
    d == 0 -> "vence hoje"
    d == 1 -> "vence amanhã"
    d < 21 -> "vence em $d dias"
    d < 60 -> "vence em ${d / 7} semanas"
    else -> "vence em ${d / 30} meses"
}

enum class Level { OK, SOON, BAD }

data class Expiry(val days: Int, val expired: Boolean, val left: Double, val level: Level, val text: String, val date: Long)

/** Expiry of one dated package: BAD under 20% of its freezer time left (or expired), SOON under half. */
fun unitExpiry(shelfMonths: Int?, ts: Long?, now: Long = System.currentTimeMillis()): Expiry? {
    if (shelfMonths == null || shelfMonths == 0 || ts == null) return null
    val date = addMonths(ts, shelfMonths)
    val d = daysBetween(now, date)
    val left = (date - now).toDouble() / (date - ts).toDouble()
    val level = if (left < 0.2) Level.BAD else if (left < 0.5) Level.SOON else Level.OK
    return Expiry(d, d < 0, left, level, inDays(d), date)
}

/** Oldest first; unknown dates first. */
fun sortUnits(u: List<Long?>): List<Long?> = u.sortedWith(compareBy<Long?> { it ?: Long.MIN_VALUE })
