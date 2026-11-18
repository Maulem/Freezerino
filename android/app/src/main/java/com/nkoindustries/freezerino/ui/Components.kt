package com.nkoindustries.freezerino.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Badge
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nkoindustries.freezerino.data.Categories
import com.nkoindustries.freezerino.data.FOODS
import com.nkoindustries.freezerino.data.FREEZERS
import com.nkoindustries.freezerino.data.Item
import com.nkoindustries.freezerino.data.Store

/** White rounded block, like `.card` on the website. */
@Composable
fun Card(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val p = LocalPal.current
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(p.surface)
        .border(1.dp, p.line, RoundedCornerShape(14.dp)), content = content)
}

@Composable
fun Divider() {
    val p = LocalPal.current
    Box(Modifier.padding(start = 16.dp).fillMaxWidth().height(1.dp).background(p.line))
}

@Composable
fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {
    val p = LocalPal.current
    Box(Modifier.clip(RoundedCornerShape(20.dp))
        .background(if (selected) p.accent else p.surface)
        .border(1.dp, if (selected) p.accent else p.line, RoundedCornerShape(20.dp))
        .clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp)) {
        Text(label, color = if (selected) p.accentInk else p.ink, fontSize = 14.5.sp, fontWeight = FontWeight.Medium)
    }
}

/** Empty state box (dashed on the website). */
@Composable
fun StateBox(title: String, text: String? = null, extra: @Composable (() -> Unit)? = null) {
    val p = LocalPal.current
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(p.surface)
        .border(1.dp, p.line, RoundedCornerShape(14.dp)).padding(horizontal = 18.dp, vertical = 26.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = p.ink)
        if (text != null) Text(text, color = p.muted, modifier = Modifier.padding(top = 6.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        if (extra != null) Box(Modifier.padding(top = 12.dp)) { extra() }
    }
}

/** Freezer Andréia / Freezer Zé switch, with the ⓘ that opens the map of the selected freezer. */
@Composable
fun FreezerSwitch(store: Store, onInfo: (() -> Unit)?) {
    val p = LocalPal.current
    val al = store.alerts()
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (onInfo != null) Box(Modifier.size(32.dp).clip(CircleShape).background(p.surface).border(1.5.dp, p.accent, CircleShape)
            .clickable(onClick = onInfo), contentAlignment = Alignment.Center) {
            Text("i", color = p.accent, fontWeight = FontWeight.Bold, fontStyle = FontStyle.Italic, fontSize = 17.sp)
        }
        Row(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(p.frost).border(1.dp, p.line, RoundedCornerShape(12.dp)).padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            for (f in FREEZERS) {
                val sel = f.id == store.fz
                val n = al.bad.count { it.f == f.id }
                Row(Modifier.weight(1f).clip(RoundedCornerShape(9.dp)).background(if (sel) p.surface else Color.Transparent)
                    .clickable { store.setFreezer(f.id) }.padding(vertical = 9.dp),
                    horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Text(f.label, color = if (sel) p.accent else p.muted, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1)
                    if (n > 0) Badge(containerColor = p.danger, modifier = Modifier.padding(start = 5.dp)) { Text("$n") }
                }
            }
        }
    }
}

/** Bottom sheet frame used by every form. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SheetFrame(title: String, onClose: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val p = LocalPal.current
    ModalBottomSheet(onDismissRequest = onClose, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = p.surface) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp).padding(bottom = 18.dp)
            .navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(title, fontSize = 21.sp, fontWeight = FontWeight.Bold, color = p.ink)
            content()
        }
    }
}

@Composable
fun Label(text: String) {
    Text(text.uppercase(), fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = LocalPal.current.muted, letterSpacing = 0.6.sp)
}

@Composable
fun Help(text: String, color: Color = LocalPal.current.muted) { Text(text, fontSize = 13.5.sp, color = color) }

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Chips(content: @Composable () -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { content() }
}

@Composable
fun OutlineButton(text: String, modifier: Modifier = Modifier, color: Color = LocalPal.current.ink, onClick: () -> Unit) {
    androidx.compose.material3.OutlinedButton(onClick = onClick, modifier = modifier, border = BorderStroke(1.dp, LocalPal.current.line),
        shape = RoundedCornerShape(12.dp)) { Text(text, color = color) }
}

@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    androidx.compose.material3.Button(onClick = onClick, modifier = modifier, enabled = enabled, shape = RoundedCornerShape(12.dp)) { Text(text) }
}

/* ---------- autocomplete for food names ---------- */

data class Suggestion(val name: String, val item: Item?, val score: Int, val rank: Int)

/** Foods already in the freezers and on the shopping list first, then the long food list. */
fun nameSuggestions(store: Store, text: String, limit: Int = 6): List<Suggestion> {
    val q = Categories.clean(text)
    if (q.isEmpty()) return emptyList()
    val seen = HashSet<String>()
    val out = ArrayList<Suggestion>()
    fun add(name: String, rank: Int, it: Item?) {
        val key = Categories.clean(name)
        if (key.isEmpty() || key in seen || key == q) return
        val score = when {
            key.startsWith(q) -> 0
            key.split(" ").any { w -> w.startsWith(q) } -> 1
            else -> return
        }
        seen += key
        out += Suggestion(name, it, score, rank)
    }
    // the freezer on screen first, so picking a food fills in its shelf there
    store.items.values.sortedByDescending { store.itemFz(it) == store.fz }.forEach { add(it.name, 0, it) }
    store.shopping.values.forEach { add(it.name, 1, null) }
    FOODS.forEach { add(it, 2, null) }
    return out.sortedWith(compareBy<Suggestion> { it.score }.thenBy { it.rank }.thenBy { it.name.length }.thenBy { it.name })
        .take(limit)
}

/** Text field with suggestions listed right under it while typing. */
@Composable
fun FoodField(
    store: Store, value: String, onChange: (String) -> Unit, placeholder: String,
    modifier: Modifier = Modifier, onPick: (Suggestion) -> Unit = {},
    trailing: @Composable (() -> Unit)? = null, imeDone: (() -> Unit)? = null,
) {
    val p = LocalPal.current
    var focused by remember { mutableStateOf(false) }
    var typed by remember { mutableStateOf(false) }
    Column(modifier) {
        OutlinedTextField(
            value = value, onValueChange = { typed = true; onChange(it) }, placeholder = { Text(placeholder) }, singleLine = true,
            modifier = Modifier.fillMaxWidth().onFocusChanged { focused = it.isFocused },
            trailingIcon = trailing, shape = RoundedCornerShape(12.dp),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                capitalization = androidx.compose.ui.text.input.KeyboardCapitalization.Sentences,
                imeAction = if (imeDone != null) androidx.compose.ui.text.input.ImeAction.Done else androidx.compose.ui.text.input.ImeAction.Default),
            keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { imeDone?.invoke() }),
        )
        val list = if (focused && typed) nameSuggestions(store, value) else emptyList()
        if (list.isNotEmpty()) Card(Modifier.padding(top = 4.dp)) {
            list.forEachIndexed { i, s ->
                if (i > 0) Divider()
                val c = Categories.byId(if (s.item != null) Categories.of(s.item) else Categories.guess(s.name))
                val t = s.item?.let { store.foodTotal(it.name) }
                Row(Modifier.fillMaxWidth().clickable { typed = false; onChange(s.name); onPick(s) }.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Text(c.icon, fontSize = 18.sp)
                    Column(Modifier.padding(start = 10.dp)) {
                        Text(s.name, color = p.ink, fontSize = 15.5.sp)
                        val listed = store.onShopList(s.name) != null
                        val notes = listOfNotNull(if (listed) "✓ já está na lista de compras" else null,
                            t?.let { "já tem ${it.text} · ${store.placesText(it.where)}" })
                        if (notes.isNotEmpty()) Text(notes.joinToString(" · "), color = if (listed) p.ok else p.muted, fontSize = 12.5.sp)
                    }
                }
            }
        }
    }
}
