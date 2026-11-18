package com.nkoindustries.freezerino.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nkoindustries.freezerino.data.LogEntry
import com.nkoindustries.freezerino.data.ShopEntry
import com.nkoindustries.freezerino.data.Store
import com.nkoindustries.freezerino.data.daysBetween
import com.nkoindustries.freezerino.data.freezerLabel
import com.nkoindustries.freezerino.data.norm
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/* ================= Compras ================= */

@Composable
fun ShoppingScreen(store: Store, open: (Sheet) -> Unit) {
    val p = LocalPal.current
    val ctx = LocalContext.current
    var text by rememberSaveable { mutableStateOf("") }
    val all = store.shopping.values.toList()
    // alphabetical, ignoring accents and case
    val openList = all.filter { !it.done }.sortedBy { norm(store.shopName(it)) }
    val done = all.filter { it.done }.sortedBy { norm(store.shopName(it)) }
    val dup = text.trim().takeIf { it.isNotEmpty() }?.let { store.onShopList(it) }
    val submit = { v: String -> val n = v.trim(); if (n.isNotEmpty() && store.addShopping(n)) text = "" }

    fun share(whatsapp: Boolean) {
        val lines = openList.map { "• " + ((it.itemId?.let { id -> store.items[id]?.name }) ?: it.name) }
        val msg = (listOf("🛒 Lista de compras", "") + lines + listOf("", "— Freezerino")).joinToString("\n")
        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, msg)
        if (whatsapp) {
            val wa = listOf("com.whatsapp", "com.whatsapp.w4b").firstOrNull {
                runCatching { ctx.packageManager.getPackageInfo(it, 0) }.isSuccess
            }
            if (wa != null) ctx.startActivity(Intent(send).setPackage(wa))
            else ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/?text=" + Uri.encode(msg))))
        } else ctx.startActivity(Intent.createChooser(send, "Enviar lista"))
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FoodField(store, text, { text = it }, "O que precisa comprar?", Modifier.weight(1f),
                    onPick = { submit(it.name) }, imeDone = { submit(text) })
                PrimaryButton("Adicionar", Modifier.padding(top = 4.dp)) { submit(text) }
            }
            // while typing: say right away when it's already on the list
            if (dup != null) Text("✓ “${store.shopName(dup)}” já está na lista", color = p.ok, fontWeight = FontWeight.SemiBold,
                fontSize = 14.5.sp, modifier = Modifier.padding(start = 4.dp, top = 6.dp))
        }
        if (all.isEmpty()) {
            item { StateBox("Nada para comprar", "Escreva acima o que precisa, ou defina em cada comida “Comprar quando tiver menos de” para ela entrar aqui sozinha.") }
            return@LazyColumn
        }
        if (openList.isNotEmpty()) {
            item { Card { openList.forEachIndexed { i, s -> if (i > 0) Divider(); ShopRow(store, s, open) } } }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    androidx.compose.material3.Button(onClick = { share(true) }, modifier = Modifier.weight(1.4f), shape = RoundedCornerShape(12.dp),
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366), contentColor = Color.White)) {
                        Text("Enviar no WhatsApp", fontWeight = FontWeight.SemiBold)
                    }
                    OutlineButton("Outro app", Modifier.weight(1f)) { share(false) }
                }
            }
        } else item { StateBox("Tudo comprado", "Nada pendente na lista.") }
        if (done.isNotEmpty()) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Comprados (${done.size})", fontSize = 19.sp, fontWeight = FontWeight.Bold, color = p.ink, modifier = Modifier.weight(1f))
                    TextButton(onClick = { store.clearDone() }) { Text("Limpar comprados", color = p.muted) }
                }
            }
            item { Card { done.forEachIndexed { i, s -> if (i > 0) Divider(); ShopRow(store, s, open) } } }
        }
    }
}

@Composable
private fun ShopRow(store: Store, s: ShopEntry, open: (Sheet) -> Unit) {
    val p = LocalPal.current
    val it = s.itemId?.let { store.items[it] }
    val name = it?.name ?: s.name
    val sub = when {
        s.auto && it != null && !s.done -> {
            val t = store.foodTotal(it.name)
            "automático · tem ${t.text}, mínimo ${it.min ?: "-"} · ${store.placesText(t.where)}"
        }
        s.auto && !s.done -> "automático"
        else -> null
    }
    Row(Modifier.fillMaxWidth().clickable { store.toggleShopping(s) }.padding(start = 12.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(26.dp).clip(CircleShape).background(if (s.done) p.ok else Color.Transparent)
            .border(2.dp, if (s.done) p.ok else p.line, CircleShape), contentAlignment = Alignment.Center) {
            if (s.done) Icon(Icons.Outlined.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
        }
        Column(Modifier.weight(1f).padding(start = 12.dp)) {
            Text(name, color = if (s.done) p.muted else p.ink, fontSize = 16.sp, textDecoration = if (s.done) TextDecoration.LineThrough else null)
            if (sub != null) Text(sub, color = p.muted, fontSize = 12.5.sp)
        }
        if (s.done) TextButton(onClick = {
            // bought and home: open "Guardar no freezer" already filled in
            open(Sheet.ItemEdit(null, name = it?.name ?: s.name, place = it?.place, fromShop = s.id))
        }) { Text("Guardar", color = p.accent, fontWeight = FontWeight.SemiBold) }
        TextButton(onClick = { store.deleteShopping(s.id) }) { Text("×", fontSize = 22.sp, color = p.muted) }
    }
}

/* ================= Histórico ================= */

private val KIND_TEXT: Map<String, (Int) -> Pair<String, String>> = mapOf(
    "add" to { n -> "colocou $n" to "" }, "take" to { n -> "tirou $n" to "" },
    "new" to { n -> (if (n > 0) "colocou $n" else "criou") to " (nova)" },
    "bought" to { n -> "guardou $n" to " (comprado)" }, "count" to { n -> "contou" to ": tem $n" },
    "del" to { _ -> "apagou" to " da lista" }, "move" to { _ -> "mudou" to " para" },
)

private val ptBR = Locale("pt", "BR")
private fun dayLabel(ts: Long): String = when (daysBetween(ts, System.currentTimeMillis())) {
    0 -> "Hoje"; 1 -> "Ontem"
    else -> SimpleDateFormat("EEEE, d 'de' MMMM", ptBR).format(Date(ts)).replaceFirstChar { it.titlecase(ptBR) }
}

@Composable
fun HistoryScreen(store: Store, open: (Sheet) -> Unit) {
    val p = LocalPal.current
    var who by remember { mutableStateOf<String?>(null) }
    val people = store.log.map { it.who }.distinct().sortedBy { norm(it) }
    if (who != null && who !in people) who = null
    val shown = store.log.filter { who == null || it.who == who }
    val days = shown.groupBy { dayLabel(it.at) }
    val time = SimpleDateFormat("HH:mm", ptBR)

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    if (people.size > 1) Chips { Chip("Todos", who == null) { who = null }; people.forEach { pp -> Chip(pp, who == pp) { who = pp } } }
                }
                TextButton(onClick = { open(Sheet.Who) }) { Text("Você: ${store.me}", color = p.muted) }
            }
        }
        if (shown.isEmpty()) {
            item { StateBox("Nada no histórico ainda", "Cada vez que alguém coloca, tira ou guarda uma comida, aparece aqui com o nome e a hora.") }
            return@LazyColumn
        }
        days.forEach { (day, list) ->
            item(key = "d-$day") { Text(day, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = p.muted, modifier = Modifier.padding(top = 6.dp)) }
            item(key = "l-$day") { Card { list.forEachIndexed { i, e -> if (i > 0) Divider(); LogRow(e, time.format(Date(e.at))) } } }
        }
    }
}

@Composable
private fun LogRow(e: LogEntry, time: String) {
    val p = LocalPal.current
    val out = e.kind == "take" || e.kind == "del"
    val (what, after) = KIND_TEXT[e.kind]?.invoke(e.n) ?: (e.kind to "")
    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(if (out) "−" else if (e.kind == "move" || e.kind == "count") "•" else "+", fontSize = 20.sp, fontWeight = FontWeight.Bold,
            color = if (out) p.danger else p.ok, modifier = Modifier.width(24.dp))
        Column {
            Text(buildAnnotatedString {
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(e.who) }
                append(" $what ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(e.item) }
                append(after)
                if (e.kind == "move") append(" ${e.place}")
            }, color = p.ink, fontSize = 15.sp)
            Text(if (e.kind == "move" || e.place.isEmpty()) time else "$time · ${e.place}", color = p.muted, fontSize = 12.5.sp)
        }
    }
}

/* ================= Prateleiras ================= */

@Composable
fun ShelvesScreen(store: Store, open: (Sheet) -> Unit) {
    val p = LocalPal.current
    val mine = store.placesIn(store.fz)
    var armed by remember { mutableStateOf<String?>(null) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { FreezerSwitch(store, onInfo = { open(Sheet.Map(store.fz)) }) }
        if (mine.isEmpty()) item { StateBox("${freezerLabel(store.fz)} sem prateleiras", "Crie a primeira prateleira ou gaveta dele.") }
        else item {
            Card {
                mine.forEachIndexed { i, pl ->
                    if (i > 0) Divider()
                    val count = store.items.values.count { it.place == pl.id }
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f).clickable { open(Sheet.PlaceEdit(pl.id)) }.padding(vertical = 8.dp)) {
                            Text(pl.label, color = p.ink, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            Text(if (count == 1) "1 comida" else "$count comidas", color = p.muted, fontSize = 13.sp)
                        }
                        TextButton(onClick = { store.movePlace(i, -1) }, enabled = i > 0) { Text("↑", fontSize = 18.sp) }
                        TextButton(onClick = { store.movePlace(i, 1) }, enabled = i < mine.size - 1) { Text("↓", fontSize = 18.sp) }
                        TextButton(onClick = {
                            when {
                                count > 0 -> store.say("Tire ou mova as $count comidas de “${pl.label}” antes de excluir.")
                                armed != pl.id -> { armed = pl.id; store.say("Toque no ✓ para confirmar") }
                                else -> { store.deletePlace(pl.id); armed = null }
                            }
                        }) { Text(if (armed == pl.id) "✓" else "×", fontSize = 20.sp, color = if (armed == pl.id) p.danger else p.muted) }
                    }
                }
            }
        }
        item { PrimaryButton("+ Nova prateleira ou gaveta", Modifier.fillMaxWidth()) { open(Sheet.PlaceEdit(null)) } }
    }
}
