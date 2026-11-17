package com.nkoindustries.freezerino.data

import java.text.Normalizer

// Same rules as categories.js on the website (the word lists are generated from it into FoodData.kt):
//   1. A dish marker anywhere ("com arroz", "ao molho", "strogonoff"…) makes it a ready meal.
//   2. Otherwise the keyword that starts earliest in the name wins; on a tie the longest one, then list order.
// Whole words, no accents or case, also in the plural (+s, +es, -ões/-ães → -ão).

data class Category(
    val id: String,
    val icon: String,
    val label: String,
    val months: Int,
    val long: Map<String, Int>,
    val short: Map<String, Int>,
    val words: List<String>,
)

object Categories {
    private val byId = CATEGORIES.associateBy { it.id }
    fun byId(id: String?): Category = byId[id] ?: byId.getValue("outros")
    fun exists(id: String?) = id != null && byId.containsKey(id)

    private val accents = Regex("\\p{Mn}+")
    private val nonWord = Regex("[^a-z0-9]+")
    private val aoFold = Regex("(oes|aes)(?= |$)")

    /** Lower case, no accents, only letters/digits/spaces, -ões/-ães folded into -ão. */
    fun clean(s: String?): String {
        val n = Normalizer.normalize(s ?: "", Normalizer.Form.NFD).replace(accents, "").lowercase()
        return n.replace(nonWord, " ").replace(aoFold, "ao").trim()
    }

    private fun wordsRe(list: List<String>): Regex {
        val alts = list.map(::clean).distinct().sortedByDescending { it.length }.joinToString("|") { Regex.escape(it) }
        return Regex("(?:^| )(?:$alts)(?:s|es)?(?= |$)")
    }

    private val matchers = CATEGORIES.filter { it.words.isNotEmpty() }.map { it.id to wordsRe(it.words) }
    private val dish = wordsRe(DISH_WORDS)

    private fun bestMatch(n: String): String? {
        var best: Triple<String, Int, Int>? = null   // id, pos, len
        for ((id, re) in matchers) {
            val r = re.find(n) ?: continue
            val lead = if (r.value.startsWith(" ")) 1 else 0
            val pos = r.range.first + lead
            val len = r.value.length - lead
            if (best == null || pos < best.second || (pos == best.second && len > best.third)) best = Triple(id, pos, len)
        }
        return best?.first
    }

    /* ---------- what the family taught the app (meta/cats, shared) ---------- */
    @Volatile private var learned: Map<String, String> = emptyMap()
    @Volatile private var learnedList: List<Pair<String, Regex>> = emptyList()

    fun setLearned(map: Map<String, String>) {
        learned = map
        learnedList = map.entries.filter { it.key.isNotEmpty() && byId.containsKey(it.value) }
            .sortedByDescending { it.key.length }
            .map { it.value to Regex("(?:^| )${Regex.escape(it.key)}(?:s|es)?(?= |$)") }
    }

    private val para = Regex(" (para|pra) .*$")

    fun guess(name: String): String {
        val n = clean(name).replace(para, "")
        if (n.isEmpty()) return "outros"
        learned[n]?.let { if (byId.containsKey(it)) return it }
        for ((id, re) in learnedList) if (re.containsMatchIn(n)) return id
        if (dish.containsMatchIn(n)) return "prontos"
        return bestMatch(n) ?: "outros"
    }

    /** The category to show: the one picked by hand, or the guess from the name. */
    fun of(item: Item): String = if (exists(item.cat)) item.cat!! else guess(item.name)

    /** Suggested freezer time in months for a food name (+ optional category picked by hand). */
    fun suggestMonths(name: String, catId: String?): Int {
        val c = byId(catId ?: guess(name))
        val n = clean(name)
        for (table in listOf(c.short, c.long)) {
            val hit = table.keys.sortedByDescending { it.length }.firstOrNull { wordsRe(listOf(it)).containsMatchIn(n) }
            if (hit != null) return table.getValue(hit)
        }
        return c.months
    }
}
