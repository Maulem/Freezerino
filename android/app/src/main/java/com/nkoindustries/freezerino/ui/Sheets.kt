package com.nkoindustries.freezerino.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.nkoindustries.freezerino.PushService
import com.nkoindustries.freezerino.data.CATEGORIES
import com.nkoindustries.freezerino.data.Categories
import com.nkoindustries.freezerino.data.PEOPLE
import com.nkoindustries.freezerino.data.Place
import com.nkoindustries.freezerino.data.Store
import com.nkoindustries.freezerino.data.ZE_PLACES
import com.nkoindustries.freezerino.data.freezerLabel
import com.nkoindustries.freezerino.data.norm
import kotlinx.coroutines.launch

/* ---------- filter by food group ---------- */

@Composable
fun FilterSheet(store: Store, close: () -> Unit) {
    val p = LocalPal.current
    val count = HashMap<String, Int>()
    for (it in store.items.values) {
        if (!(store.isUnknown(it.id) || store.unitsOf(it.id).isNotEmpty())) continue
        val c = Categories.of(it); count[c] = (count[c] ?: 0) + 1
    }
    val total = count.values.sum()
    val cats = CATEGORIES.filter { (count[it.id] ?: 0) > 0 || it.id == FreezerFilters.catFilter }
    SheetFrame("Filtrar por tipo", close) {
        Help("Mostra só esse tipo de comida, dos dois freezers.")
        if (cats.isEmpty()) Text("O freezer está vazio.", color = p.ink)
        else {
            val tiles = listOf(Triple<String?, String, String>(null, "🍽️", "Tudo") to total) +
                cats.map { Triple<String?, String, String>(it.id, it.icon, it.label) to (count[it.id] ?: 0) }
            tiles.chunked(3).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { (t, n) ->
                        val sel = FreezerFilters.catFilter == t.first
                        Column(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(if (sel) p.accentSoft else p.frost)
                            .border(1.5.dp, if (sel) p.accent else p.line, RoundedCornerShape(12.dp))
                            .clickable { FreezerFilters.catFilter = t.first; close() }.padding(vertical = 10.dp, horizontal = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(t.second, fontSize = 24.sp)
                            Text(t.third, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = p.ink, textAlign = TextAlign.Center, maxLines = 2)
                            Text(if (n == 1) "1 comida" else "$n comidas", fontSize = 11.5.sp, color = p.muted)
                        }
                    }
                    repeat(3 - row.size) { Box(Modifier.weight(1f)) }
                }
            }
        }
        OutlineButton("Fechar", Modifier.fillMaxWidth(), onClick = close)
    }
}

/* ---------- 2D map of a freezer (ⓘ) ---------- */

@Composable
fun MapSheet(store: Store, f: String, close: () -> Unit) {
    val p = LocalPal.current
    val mine = store.placesIn(f)
    var picked by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<List<Pair<String, String>>?>(null) }   // label -> foods
    var missing by remember { mutableStateOf<String?>(null) }

    fun nums(pl: Place) = Regex("\\d").findAll(norm(pl.label)).map { it.value.toInt() }.toList()
    fun isDoor(pl: Place) = norm(pl.label).contains("porta")
    fun findDoor(ns: List<Int>) = mine.filter { isDoor(it) && nums(it).any { n -> n in ns } }
    fun findIn(kind: String, n: Int) = mine.filter { !isDoor(it) && norm(it.label).contains(kind) && nums(it).firstOrNull() == n }.take(1)

    @Composable
    fun ColumnScope.slot(key: String, ps: List<Place>, label: String, height: Dp, weight: Float? = null, style: String = "shelf") {
        val lists = ps.map { pl -> pl to store.items.values.filter { it.place == pl.id } }
        val total = lists.sumOf { it.second.size }
        val sel = picked == key
        val shape = when (style) { "shelf" -> RoundedCornerShape(4.dp); else -> RoundedCornerShape(8.dp) }
        var m = Modifier.fillMaxWidth()
        m = if (weight != null) m.weight(weight) else m.height(height)
        Box(m.clip(shape).background(if (sel) p.accentSoft else if (style == "shelf") p.frost else p.surface)
            .border(if (style == "shelf") 0.dp else 1.5.dp, if (sel) p.accent else p.line, shape)
            .drawBehind {
                if (style == "shelf") drawRect(if (sel) p.accent else p.line, topLeft = androidx.compose.ui.geometry.Offset(0f, size.height - 4.dp.toPx()),
                    size = androidx.compose.ui.geometry.Size(size.width, 4.dp.toPx()))
                if (style == "drawer" || style == "lid") drawRoundRect(p.line, topLeft = androidx.compose.ui.geometry.Offset(size.width * .33f, 6.dp.toPx()),
                    size = androidx.compose.ui.geometry.Size(size.width * .34f, 4.dp.toPx()), cornerRadius = CornerRadius(4f))
            }
            .clickable {
                picked = key
                if (ps.isEmpty()) { info = null; missing = label }
                else { missing = null; info = lists.map { (pl, l) -> pl.label to (if (l.isEmpty()) "vazia." else l.joinToString(", ") { d -> d.name + if (d.unknown) "" else " (${d.units.size})" }) } }
            }, contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(label, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = p.ink, textAlign = TextAlign.Center)
                if (ps.isNotEmpty()) Text(if (total == 0) "vazia" else if (total == 1) "1 comida" else "$total comidas", fontSize = 11.5.sp, color = p.muted)
            }
        }
    }

    @Composable
    fun dashed(text: String, height: Dp) {
        Box(Modifier.fillMaxWidth().height(height).drawBehind {
            drawRoundRect(p.line, style = Stroke(1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f))), cornerRadius = CornerRadius(16f))
        }, contentAlignment = Alignment.Center) { Text(text, fontSize = 12.sp, color = p.out, textAlign = TextAlign.Center) }
    }

    @Composable
    fun box(title: String?, modifier: Modifier, content: @Composable ColumnScope.() -> Unit) {
        Column(modifier.clip(RoundedCornerShape(12.dp)).background(p.frost).border(2.dp, p.line, RoundedCornerShape(12.dp)).padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)) {
            if (title != null) Text(title.uppercase(), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = p.muted, letterSpacing = .6.sp,
                modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
            content()
        }
    }

    SheetFrame(freezerLabel(f), close) {
        Help("Com a porta aberta, de cima para baixo.")
        if (f == "ze") {
            // Freezer Zé: nothing on the door; shelves created by the app with fixed ids
            fun z(id: String) = mine.filter { it.id == id }
            fun zl(id: String) = mine.firstOrNull { it.id == id }?.label ?: ZE_PLACES.first { it.id == id }.label
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                box(null, Modifier.widthIn(max = 260.dp).fillMaxWidth()) {
                    slot("ze-p12", z("ze-p12"), zl("ze-p12"), 92.dp, style = "lid")
                    slot("ze-p34", z("ze-p34"), zl("ze-p34"), 84.dp)
                    slot("ze-gp", z("ze-gp"), zl("ze-gp"), 46.dp, style = "drawer")
                    slot("ze-p5", z("ze-p5"), zl("ze-p5"), 58.dp)
                    listOf("ze-g1", "ze-g2", "ze-g3").forEach { slot(it, z(it), zl(it), 68.dp, style = "drawer") }
                }
            }
        } else {
            Row(Modifier.fillMaxWidth().height(470.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                box("Porta", Modifier.weight(2f).fillMaxWidth().fillMaxHeight()) {
                    slot("d12", findDoor(listOf(1, 2)), "1ª e 2ª", 70.dp, weight = 2f, style = "block")
                    dashed("gelo e água", 96.dp)
                    slot("d345", findDoor(listOf(3, 4, 5)), "3ª, 4ª e 5ª", 70.dp, weight = 3f, style = "block")
                }
                box("Dentro", Modifier.weight(3f).fillMaxWidth().fillMaxHeight()) {
                    dashed("máquina de gelo", 52.dp)
                    (1..3).forEach { slot("p$it", findIn("prateleira", it), "${it}ª Prateleira", 58.dp, weight = 58f) }
                    (1..2).forEach { slot("g$it", findIn("gaveta", it), "${it}ª Gaveta", 68.dp, weight = 68f, style = "drawer") }
                }
            }
        }
        val txt = buildAnnotatedString {
            when {
                missing != null -> { withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = p.ink)) { append(missing!!) }; append(" não está na aba Prateleiras.") }
                info != null -> info!!.forEachIndexed { i, (l, foods) ->
                    if (i > 0) append("\n")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = p.ink)) { append("$l: ") }; append(foods)
                }
                else -> append("Toque numa prateleira para ver o que tem nela.")
            }
        }
        Text(txt, color = p.muted, fontSize = 14.5.sp)
        OutlineButton("Fechar", Modifier.fillMaxWidth(), onClick = close)
    }
}

/* ---------- who uses this phone ---------- */

@Composable
fun WhoSheet(store: Store, close: () -> Unit) {
    val cur = store.who ?: ""
    var other by remember { mutableStateOf(if (cur in PEOPLE) "" else cur) }
    val pick = { n: String ->
        val name = n.trim().take(40)
        if (name.isNotEmpty()) { store.chooseWho(name); store.say("Olá, $name!"); close() }
    }
    SheetFrame("Quem usa este celular?", close) {
        Help("Aparece no histórico de quem colocou e tirou cada comida.")
        Chips { PEOPLE.forEach { Chip(it, it == cur) { pick(it) } } }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(other, { other = it }, singleLine = true, placeholder = { Text("Outro nome") },
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
            PrimaryButton("Sou eu") { pick(other) }
        }
    }
}

/* ---------- expiry notifications ---------- */

@Composable
fun BellSheet(store: Store, close: () -> Unit) {
    val p = LocalPal.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(store.prefs.getString("deviceName", null) ?: store.who ?: "") }
    var busy by remember { mutableStateOf(false) }
    var msg by remember { mutableStateOf<String?>(null) }
    val others = store.devices.filterKeys { it != store.deviceId }.values

    val enable = {
        busy = true; msg = null
        scope.launch {
            try { store.enablePush(name.trim().ifEmpty { "Celular" }); store.say("Avisos ativados neste celular"); close() }
            catch (e: Exception) { msg = "Não consegui ativar. Confira a internet e tente de novo." }
            busy = false
        }
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) enable() else msg = "Você não permitiu os avisos. Se mudar de ideia, libere nas configurações do celular."
    }
    val granted = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    SheetFrame("Avisos de validade", close) {
        Help("Todo dia às 9h o Freezerino confere os dois freezers e avisa quando uma comida passa da metade da validade, fica perto de vencer ou vence.")
        if (store.pushOn && granted) {
            Text(buildAnnotatedString {
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("Ativado neste celular") }
                append(" (${store.prefs.getString("deviceName", null) ?: "Celular"}).")
            }, color = p.ink)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlineButton("Mostrar um teste", Modifier.weight(1f)) {
                    PushService.show(ctx, "Freezerino", "Teste: os avisos estão funcionando neste celular.", "freezerino-test")
                }
                OutlineButton("Desativar", Modifier.weight(1f), color = p.danger) {
                    scope.launch { store.disablePush(); store.say("Avisos desativados neste celular"); close() }
                }
            }
        } else {
            Label("Nome deste celular")
            OutlinedTextField(name, { name = it.take(40) }, singleLine = true, placeholder = { Text("Ex: Celular da Andréia") },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            Help("Para saber quem recebe os avisos.")
            PrimaryButton(if (busy) "Ativando…" else "Ativar avisos", Modifier.fillMaxWidth(), enabled = !busy) {
                if (granted) enable() else ask.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        msg?.let { Help(it, p.danger) }
        if (others.isNotEmpty()) Help("Também recebem: ${others.joinToString(", ")}.")
        OutlineButton("Fechar", Modifier.fillMaxWidth(), onClick = close)
    }
}

/* ---------- new / rename shelf ---------- */

@Composable
fun PlaceSheet(store: Store, id: String?, close: () -> Unit) {
    val editing = id?.let { store.place(it) }
    var label by remember { mutableStateOf(editing?.label ?: "") }
    SheetFrame(if (editing != null) "Renomear" else "Nova prateleira no ${freezerLabel(store.fz)}", close) {
        Label("Nome")
        OutlinedTextField(label, { label = it.take(40) }, singleLine = true, placeholder = { Text("Ex: Porta do freezer") },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlineButton("Cancelar", Modifier.weight(1f), onClick = close)
            PrimaryButton(if (editing != null) "Salvar" else "Criar", Modifier.weight(1f)) {
                val l = label.trim()
                if (l.isEmpty()) return@PrimaryButton
                if (editing != null) store.renamePlace(editing.id, l) else store.addPlace(l)
                close()
            }
        }
    }
}
