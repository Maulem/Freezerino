package com.nkoindustries.freezerino.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nkoindustries.freezerino.data.CATEGORIES
import com.nkoindustries.freezerino.data.Categories
import com.nkoindustries.freezerino.data.FREEZERS
import com.nkoindustries.freezerino.data.Level
import com.nkoindustries.freezerino.data.SHELF_OPTIONS
import com.nkoindustries.freezerino.data.Store
import com.nkoindustries.freezerino.data.ago
import com.nkoindustries.freezerino.data.freezerLabel
import com.nkoindustries.freezerino.data.norm
import com.nkoindustries.freezerino.data.sortUnits
import com.nkoindustries.freezerino.data.unitExpiry
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private val dateFmt = SimpleDateFormat("dd/MM/yyyy", Locale("pt", "BR"))
fun fmtDate(ts: Long): String = dateFmt.format(Date(ts))

/** Today at noon (local), like the website's date input. */
private fun noon(ts: Long = System.currentTimeMillis()) = Calendar.getInstance().apply {
    timeInMillis = ts; set(Calendar.HOUR_OF_DAY, 12); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
}.timeInMillis

/** Add or edit a food. Also "Guardar no freezer" from the shopping list (fromShop). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemSheet(store: Store, s: Sheet.ItemEdit, close: () -> Unit, goShelves: () -> Unit) {
    val p = LocalPal.current
    val editing = s.id?.let { store.items[it] }
    if (s.id != null && editing == null) { close(); return }
    if (editing == null && s.place == null && store.placesIn(store.fz).isEmpty()) {
        LaunchedEffect(Unit) { store.say("Crie uma prateleira no ${freezerLabel(store.fz)} primeiro."); goShelves() }
        return
    }
    LaunchedEffect(Unit) { if (s.id != null && store.pending.containsKey(s.id)) store.flush(s.id) }

    // what we start from: the item being edited, or (from the shopping list) the same food already in a freezer
    val base = editing ?: s.name?.let { n ->
        val same = store.items.values.filter { norm(it.name) == norm(n) }
        same.firstOrNull { store.itemFz(it) == store.fz } ?: same.firstOrNull()
    }

    var name by remember { mutableStateOf(editing?.name ?: base?.name ?: s.name ?: "") }
    var place by remember {
        mutableStateOf(editing?.place ?: (s.place ?: base?.place)?.takeIf { store.place(it) != null }
            ?: store.placesIn(store.fz).firstOrNull()?.id ?: store.places.first().id)
    }
    val units = remember { mutableStateListOf<Long?>().apply { if (editing != null) addAll(sortUnits(store.unitsOf(editing.id))) } }
    var unknown by remember { mutableStateOf(editing?.unknown ?: false) }
    var shelf by remember { mutableStateOf(if (editing != null || base != null) base?.shelfMonths else 3) }
    var shelfTouched by remember { mutableStateOf(editing != null || base != null) }
    var minText by remember { mutableStateOf((base?.min)?.toString() ?: "") }
    var note by remember { mutableStateOf(editing?.note ?: "") }
    var cat by remember { mutableStateOf(base?.cat) }   // null = guess from the name
    var addN by remember { mutableStateOf("1") }
    var addDate by remember { mutableStateOf(noon()) }
    var armed by remember { mutableStateOf(false) }
    var pickDate by remember { mutableStateOf(false) }

    val guessed = Categories.byId(Categories.guess(name))
    val suggested = if (name.isBlank()) null else Categories.suggestMonths(name, cat)
    LaunchedEffect(name, cat) { if (!shelfTouched && suggested != null) shelf = suggested }

    val title = when { editing != null -> "Editar comida"; s.fromShop != null -> "Guardar no freezer"; else -> "Colocar no freezer" }
    SheetFrame(title, close) {
        Label("Comida")
        if (editing != null) OutlinedTextField(name, { name = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences))
        else FoodField(store, name, { name = it }, "Ex: Peito de frango", onPick = { sg ->
            // an existing food: new packages go where it already is, with its settings
            val it = sg.item ?: return@FoodField
            if (store.place(it.place) != null) place = it.place
            if (it.shelfMonths != null) { shelf = it.shelfMonths; shelfTouched = true }
            if (it.min != null && minText.isEmpty()) minText = it.min.toString()
            if (it.cat != null) cat = it.cat
        })

        Label("Tipo")
        Dropdown(
            text = Categories.byId(cat ?: guessed.id).let { c -> "${c.icon} ${c.label}" + if (cat == null) " (automático)" else "" },
            options = listOf<Pair<String?, String>>(null to "${guessed.icon} ${guessed.label} (automático)") + CATEGORIES.map { it.id to "${it.icon} ${it.label}" },
            onPick = { cat = it },
        )

        Label("Onde")
        for (f in FREEZERS) {
            val ps = store.placesIn(f.id)
            if (ps.isEmpty()) continue
            Text(f.label, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = p.muted)
            Chips { ps.forEach { pl -> Chip(pl.label, pl.id == place) { place = pl.id } } }
        }

        if (editing != null) {
            Label("Entradas (uma por pacote)")
            Card {
                if (units.isEmpty()) Text(if (unknown) "Quantidade desconhecida. Adicione as entradas abaixo." else "Nenhuma entrada. Adicione abaixo.",
                    color = p.muted, modifier = Modifier.padding(14.dp))
                units.forEachIndexed { i, ts ->
                    if (i > 0) Divider()
                    val e = unitExpiry(shelf, ts)
                    Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(if (ts == null) "Data desconhecida" else "Entrou em ${fmtDate(ts)}", color = p.ink)
                            if (e != null) Text("${e.text} (${fmtDate(e.date)})", fontSize = 13.sp,
                                color = when (e.level) { Level.BAD -> p.danger; Level.SOON -> p.warn; else -> p.muted })
                            else if (ts != null) Text(ago(ts), fontSize = 13.sp, color = p.muted)
                        }
                        TextButton(onClick = { units.removeAt(i) }) { Text("×", fontSize = 22.sp, color = p.muted) }
                    }
                }
            }
            Help("Ao tirar com o −, sai sempre a mais antiga.")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                NumberField(addN, { addN = it }, Modifier.width(76.dp))
                DateButton(addDate, Modifier.weight(1f)) { pickDate = true }
                OutlineButton("+ Entrada") {
                    val n = (addN.toIntOrNull() ?: 1).coerceIn(1, 50)
                    repeat(n) { units += addDate }
                    val sorted = sortUnits(units.toList()); units.clear(); units.addAll(sorted)
                    unknown = false; addN = "1"
                }
            }
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) { Label("Quantidade"); NumberField(addN, { addN = it }, Modifier.fillMaxWidth()) }
                Column(Modifier.weight(1.4f), verticalArrangement = Arrangement.spacedBy(6.dp)) { Label("Data que entrou"); DateButton(addDate, Modifier.fillMaxWidth()) { pickDate = true } }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Label("Validade no freezer")
                Dropdown(SHELF_OPTIONS.firstOrNull { it.first == shelf }?.second ?: "$shelf meses", SHELF_OPTIONS) { shelf = it; shelfTouched = true }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Label("Comprar com menos de")
                NumberField(minText, { minText = it }, Modifier.fillMaxWidth(), placeholder = "Não avisar")
            }
        }
        if (suggested != null) {
            val c = Categories.byId(cat ?: guessed.id)
            Help("Sugerido para ${c.icon} ${c.label}: ${SHELF_OPTIONS.firstOrNull { it.first == suggested }?.second ?: "$suggested meses"}")
        }

        Label("Observação")
        OutlinedTextField(note, { note = it }, singleLine = true, placeholder = { Text("Opcional (ex: porção de 500 g)") },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences))

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlineButton("Cancelar", Modifier.weight(1f), onClick = close)
            PrimaryButton(if (editing != null) "Salvar" else if (s.fromShop != null) "Guardar" else "Adicionar", Modifier.weight(1f)) {
                val nm = name.trim()
                if (nm.isEmpty()) { store.say("Escreva o nome da comida."); return@PrimaryButton }
                val min = minText.toIntOrNull()?.takeIf { it > 0 }?.coerceAtMost(999)
                store.saveItem(editing, nm, place, units.toList(), unknown, shelf, min, note.trim(), cat,
                    (addN.toIntOrNull() ?: 0).coerceIn(0, 50), addDate, s.fromShop)
                close()
            }
        }
        if (editing != null) {
            androidx.compose.material3.OutlinedButton(onClick = {
                if (!armed) armed = true else { store.removeItem(editing.id); close() }
            }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, p.danger),
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = if (armed) p.danger else p.surface)) {
                Text(if (armed) "Toque de novo para remover" else "Remover do freezer", color = if (armed) p.accentInk else p.danger)
            }
        }
    }

    if (pickDate) {
        val utcNoonToday = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            val l = Calendar.getInstance(); clear(); set(l.get(Calendar.YEAR), l.get(Calendar.MONTH), l.get(Calendar.DAY_OF_MONTH), 23, 59)
        }.timeInMillis
        val local = Calendar.getInstance().apply { timeInMillis = addDate }
        val initialUtc = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear(); set(local.get(Calendar.YEAR), local.get(Calendar.MONTH), local.get(Calendar.DAY_OF_MONTH))
        }.timeInMillis
        val state = rememberDatePickerState(initialSelectedDateMillis = initialUtc, selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long) = utcTimeMillis <= utcNoonToday
        })
        DatePickerDialog(onDismissRequest = { pickDate = false },
            confirmButton = { TextButton(onClick = {
                state.selectedDateMillis?.let { utc ->
                    val u = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { timeInMillis = utc }
                    addDate = Calendar.getInstance().apply {
                        clear(); set(u.get(Calendar.YEAR), u.get(Calendar.MONTH), u.get(Calendar.DAY_OF_MONTH), 12, 0)
                    }.timeInMillis
                }
                pickDate = false
            }) { Text("OK") } },
            dismissButton = { TextButton(onClick = { pickDate = false }) { Text("Cancelar") } }) {
            DatePicker(state = state, title = { Text("Data que entrou", modifier = Modifier.padding(start = 24.dp, top = 16.dp)) })
        }
    }
}

@Composable
fun NumberField(value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier, placeholder: String? = null) {
    OutlinedTextField(value, { v -> onChange(v.filter { it.isDigit() }.take(3)) }, singleLine = true, modifier = modifier,
        shape = RoundedCornerShape(12.dp), placeholder = placeholder?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
}

@Composable
private fun DateButton(ts: Long, modifier: Modifier, onClick: () -> Unit) {
    val p = LocalPal.current
    Box(modifier.clip(RoundedCornerShape(12.dp)).border(1.dp, p.out, RoundedCornerShape(12.dp)).clickable(onClick = onClick)
        .padding(horizontal = 14.dp, vertical = 16.dp)) {
        Text(if (noon(ts) == noon()) "Hoje (${fmtDate(ts)})" else fmtDate(ts), color = p.ink)
    }
}

@Composable
fun <T> Dropdown(text: String, options: List<Pair<T, String>>, onPick: (T) -> Unit) {
    val p = LocalPal.current
    var open by remember { mutableStateOf(false) }
    Box {
        Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, p.out, RoundedCornerShape(12.dp))
            .clickable { open = true }.padding(horizontal = 14.dp, vertical = 16.dp)) {
            Text("$text  ▾", color = p.ink, maxLines = 1)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }, modifier = Modifier.background(p.surface)) {
            options.forEach { (v, label) -> DropdownMenuItem(text = { Text(label) }, onClick = { open = false; onPick(v) }) }
        }
    }
}
