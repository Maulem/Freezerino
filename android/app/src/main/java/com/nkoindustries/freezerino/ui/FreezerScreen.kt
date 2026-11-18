package com.nkoindustries.freezerino.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.FilterAlt
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nkoindustries.freezerino.data.Categories
import com.nkoindustries.freezerino.data.FREEZERS
import com.nkoindustries.freezerino.data.Item
import com.nkoindustries.freezerino.data.Level
import com.nkoindustries.freezerino.data.Place
import com.nkoindustries.freezerino.data.Store
import com.nkoindustries.freezerino.data.ago
import com.nkoindustries.freezerino.data.freezerLabel
import com.nkoindustries.freezerino.data.freezerShort
import com.nkoindustries.freezerino.data.norm
import com.nkoindustries.freezerino.data.sortUnits
import com.nkoindustries.freezerino.data.unitExpiry

/** Filters that stay while switching tabs. */
object FreezerFilters {
    var catFilter by mutableStateOf<String?>(null)
    var alertOnly by mutableStateOf(false)
}

@Composable
fun FreezerScreen(store: Store, open: (Sheet) -> Unit, goShelves: () -> Unit) {
    val p = LocalPal.current
    var query by rememberSaveable { mutableStateOf("") }
    val q = norm(query)
    val catFilter = FreezerFilters.catFilter
    val al = store.alerts()
    val alertOnly = FreezerFilters.alertOnly && (al.bad.isNotEmpty() || al.soon.isNotEmpty())
    val alertIds = (al.bad + al.soon).map { it.id }.toSet()
    val filtering = q.isNotEmpty() || alertOnly || catFilter != null
    val all = store.items.values.toList()
    // The name contains the text ("le" finds Lentilha, Pele de frango…). A food group only counts from 4 letters and
    // at the start of one of its words ("legu" → Legumes e verduras), so "fe" doesn't bring every bean.
    val catHit = { it: Item -> q.length >= 4 && norm(Categories.byId(Categories.of(it)).label).split(" ").any { w -> w.startsWith(q) } }
    val shown = all.filter { it ->
        (q.isEmpty() || norm(it.name).contains(q) || catHit(it))
            && (!alertOnly || it.id in alertIds) && (catFilter == null || Categories.of(it) == catFilter)
    }
    val inStock = { it: Item -> store.isUnknown(it.id) || store.unitsOf(it.id).isNotEmpty() }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // search + filter
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(value = query, onValueChange = { query = it }, singleLine = true,
                    placeholder = { Text("Procurar comida… (ex: feijão)") }, modifier = Modifier.weight(1f),
                    leadingIcon = { Icon(Icons.Outlined.Search, null) }, shape = RoundedCornerShape(12.dp),
                    trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Outlined.Close, "Limpar") } })
                Spacer(Modifier.width(8.dp))
                Box(Modifier.size(54.dp).clip(RoundedCornerShape(12.dp)).background(if (catFilter != null) p.accentSoft else p.surface)
                    .border(1.dp, if (catFilter != null) p.accent else p.line, RoundedCornerShape(12.dp))
                    .clickable { open(Sheet.Filter) }, contentAlignment = Alignment.Center) {
                    if (catFilter != null) Text(Categories.byId(catFilter).icon, fontSize = 22.sp)
                    else Icon(Icons.Outlined.FilterAlt, "Filtrar por tipo de comida", tint = p.muted)
                }
            }
        }
        // answer line for search / group filter
        if (store.ready && (q.isNotEmpty() || catFilter != null)) item {
            val text = buildAnnotatedString {
                if (q.isNotEmpty()) {
                    if (shown.isEmpty()) append(if (alertOnly) "Nenhuma comida vencendo com esse nome." else "Não achei isso no freezer.")
                    // a few foods: where each one is; many: just how many (the shelves below show them)
                    else if (shown.size <= 3) shown.forEachIndexed { k, it ->
                        if (k > 0) append("\n")
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = p.ink)) { append(it.name) }
                        append(" está na ${store.placeFull(it.place)}")
                    }
                    else { withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = p.ink)) { append("${shown.size} comidas") }; append(" com “${query.trim()}”, nas prateleiras abaixo") }
                } else {
                    val c = Categories.byId(catFilter)
                    val stock = shown.filter(inStock)
                    if (stock.isEmpty()) append("Não tem ${c.label.lowercase()} no freezer agora.")
                    else {
                        append("${c.icon} ${c.label}: ${if (stock.size == 1) "1 comida" else "${stock.size} comidas"} em ")
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = p.ink)) { append(stock.map { store.placeFull(it.place) }.distinct().joinToString(", ")) }
                    }
                }
            }
            Column {
                Text(text, color = p.muted, fontSize = 15.sp)
                if (catFilter != null && q.isEmpty()) Text("Ver tudo", color = p.accent, fontWeight = FontWeight.SemiBold,
                    textDecoration = TextDecoration.Underline, modifier = Modifier.padding(top = 4.dp).clickable { FreezerFilters.catFilter = null })
            }
        }
        if (!store.ready) { item { Text("Abrindo o Freezerino…", color = p.muted) }; return@LazyColumn }

        item { AlertBox(store) }
        if (!filtering) item { FreezerSwitch(store, onInfo = { open(Sheet.Map(store.fz)) }) }

        if (!filtering && store.placesIn(store.fz).isEmpty()) {
            item {
                StateBox("${freezerLabel(store.fz)} ainda não tem prateleiras",
                    "Crie as prateleiras e gavetas dele para começar a guardar comida aqui.") {
                    PrimaryButton("Criar prateleiras", onClick = goShelves)
                }
            }
            return@LazyColumn
        }

        // searching or filtering looks in both freezers; otherwise just the chosen one
        val sections: MutableList<Place> = (if (filtering) FREEZERS.flatMap { store.placesIn(it.id) } else store.placesIn(store.fz)).toMutableList()
        val orphan = all.filter { store.place(it.place) == null }
        if (orphan.isNotEmpty() && (filtering || store.fz == "andreia")) sections += Place("__none", "Sem lugar", 9999.0, "andreia")
        var any = false
        for (pl in sections) {
            var its = shown.filter { if (pl.id == "__none") store.place(it.place) == null else it.place == pl.id }
            its = if (alertOnly) its.sortedBy { store.itemExpiry(it)?.left ?: 9.0 } else its.sortedBy { norm(it.name) }
            if (filtering && its.isEmpty()) continue
            any = true
            val total = its.count(inStock)
            val count = if (total == 1) "1 item" else "$total itens"
            item(key = "sec-" + pl.id) {
                Card {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 8.dp), verticalAlignment = Alignment.Bottom) {
                        Text(pl.label, fontSize = 19.sp, fontWeight = FontWeight.Bold, color = p.accent, modifier = Modifier.weight(1f))
                        Text(if (filtering && pl.id != "__none") "${freezerShort(pl.freezer)} · $count" else count, fontSize = 13.sp, color = p.muted)
                    }
                    if (its.isEmpty()) Text("Vazio", color = p.muted, fontSize = 14.sp, modifier = Modifier.padding(start = 16.dp, bottom = 14.dp))
                    its.forEachIndexed { i, it ->
                        if (i > 0) Divider()
                        ItemRow(store, it, onEdit = { open(Sheet.ItemEdit(it.id)) })
                    }
                }
            }
        }
        if (filtering && !any && q.isEmpty()) item { StateBox("Nada vencendo") }
    }
}

@Composable
private fun AlertBox(store: Store) {
    val p = LocalPal.current
    val al = store.alerts()
    val total = al.bad.size + al.soon.size
    val shape = RoundedCornerShape(12.dp)
    if (total == 0) {
        Row(Modifier.fillMaxWidth().clip(shape).background(p.surface).border(1.dp, p.line, shape).padding(12.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(10.dp).clip(CircleShape).background(p.ok))
            Text("Tudo dentro da validade", color = p.muted, modifier = Modifier.padding(start = 10.dp))
        }
        return
    }
    val hot = al.bad.isNotEmpty()
    val on = FreezerFilters.alertOnly
    Row(Modifier.fillMaxWidth().clip(shape).background(if (hot) p.dangerSoft else p.warnSoft)
        .border(1.5.dp, if (on) p.accent else if (hot) p.danger.copy(alpha = .5f) else p.warn.copy(alpha = .4f), shape)
        .clickable { FreezerFilters.alertOnly = !on }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(if (hot) p.danger else p.warn))
        Column(Modifier.weight(1f).padding(start = 10.dp)) {
            if (al.expired > 0) Text(if (al.expired == 1) "1 vencido" else "${al.expired} vencidos", color = p.danger, fontWeight = FontWeight.Bold, fontSize = 14.5.sp)
            val red = al.bad.size - al.expired
            if (red > 0) Text(if (red == 1) "1 para usar logo" else "$red para usar logo", color = p.danger, fontWeight = FontWeight.Bold, fontSize = 14.5.sp)
            if (al.soon.isNotEmpty()) Text(if (al.soon.size == 1) "1 passou da metade" else "${al.soon.size} passaram da metade", color = p.warn, fontWeight = FontWeight.Bold, fontSize = 14.5.sp)
        }
        Text(if (on) "Ver tudo" else "Ver", color = p.accent, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ItemRow(store: Store, it: Item, onEdit: () -> Unit) {
    val p = LocalPal.current
    val units = sortUnits(store.unitsOf(it.id))
    val n = units.size
    val unknown = store.isUnknown(it.id)
    val out = !unknown && n == 0
    val dated = units.filterNotNull()
    val oldest = dated.firstOrNull()
    val exp = if (out) null else unitExpiry(it.shelfMonths, oldest)
    val low = !unknown && it.min != null && n < it.min
    val c = Categories.byId(Categories.of(it))

    val meta = when {
        out -> "acabou"
        unknown || n == 0 -> ""
        dated.isEmpty() -> "sem data de entrada"
        n == 1 -> "colocado ${ago(oldest!!)}"
        units[0] == null -> "mais antigo: sem data · último: ${ago(units[n - 1]!!)}"
        else -> "mais antigo: ${ago(oldest!!)}"
    }
    val nameColor = when { out -> p.out; exp?.level == Level.BAD -> p.danger; exp?.level == Level.SOON -> p.warn; else -> p.ink }

    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 10.dp, top = 10.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f).clickable(onClick = onEdit)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(c.icon, fontSize = 16.sp)
                Text(it.name, color = nameColor, fontSize = 16.5.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 6.dp),
                    textDecoration = if (out) TextDecoration.LineThrough else null)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 2.dp)) {
                if (unknown) Tag("conferir quantidade", p.warn, p.warnSoft)
                if (exp != null && exp.expired) Tag(exp.text, p.danger, p.dangerSoft)
                if (low) Tag("na lista de compras", p.accent, p.accentSoft)
            }
            if (exp != null && !exp.expired) Text(exp.text, fontSize = 13.sp, color = when (exp.level) { Level.BAD -> p.danger; Level.SOON -> p.warn; else -> p.muted },
                fontWeight = if (exp.level == Level.OK) FontWeight.Normal else FontWeight.SemiBold)
            if (meta.isNotEmpty()) Text(meta, fontSize = 13.sp, color = p.muted)
            if (it.note.isNotEmpty()) Text(it.note, fontSize = 13.sp, color = p.muted)
            if (out && it.min == null) Text("Tirar da lista", color = p.danger, fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp).clickable { store.removeItem(it.id) })
        }
        Stepper(store, it.id, unknown, out, n, onUnknown = onEdit)
    }
}

@Composable
private fun Tag(text: String, fg: androidx.compose.ui.graphics.Color, bg: androidx.compose.ui.graphics.Color) {
    Text(text.uppercase(), color = fg, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.4.sp,
        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(bg).padding(horizontal = 6.dp, vertical = 2.dp))
}

@Composable
private fun Stepper(store: Store, id: String, unknown: Boolean, out: Boolean, n: Int, onUnknown: () -> Unit) {
    val p = LocalPal.current
    @Composable
    fun btn(label: String, enabled: Boolean, onClick: () -> Unit) {
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, p.line, RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick), contentAlignment = Alignment.Center) {
            Text(label, fontSize = 22.sp, color = if (enabled) p.accent else p.out, fontWeight = FontWeight.Bold)
        }
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        btn("−", !out) { if (unknown) onUnknown() else store.bump(id, -1) }
        Text(if (unknown) "?" else "$n", fontSize = 18.sp, fontWeight = FontWeight.Bold,
            color = if (unknown) p.warn else p.ink, modifier = Modifier.width(36.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        btn("+", true) { if (unknown) onUnknown() else store.bump(id, 1) }
    }
    Spacer(Modifier.height(0.dp))
}
