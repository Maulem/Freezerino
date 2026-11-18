package com.nkoindustries.freezerino.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nkoindustries.freezerino.BuildConfig
import com.nkoindustries.freezerino.data.PEOPLE
import com.nkoindustries.freezerino.data.Store

/** Whether the shelves page is open inside Ajustes (also opened from "Criar prateleiras"). */
object SettingsNav { var shelves by mutableStateOf(false) }

@Composable
fun SettingsScreen(store: Store, open: (Sheet) -> Unit) {
    if (SettingsNav.shelves) {
        BackHandler { SettingsNav.shelves = false }
        Column(Modifier.fillMaxSize()) {
            TextButton(onClick = { SettingsNav.shelves = false }, modifier = Modifier.padding(start = 6.dp)) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, null)
                Text("Ajustes", modifier = Modifier.padding(start = 6.dp))
            }
            ShelvesScreen(store, open)
        }
        return
    }
    val p = LocalPal.current
    val cur = store.who
    var other by remember { mutableStateOf(if (cur != null && cur !in PEOPLE) cur else "") }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // ---- user ----
        Section("Usuário")
        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Quem usa este celular? Aparece no histórico de quem colocou e tirou cada comida.", color = p.muted, fontSize = 14.sp)
                Chips {
                    PEOPLE.forEach { name ->
                        Chip(name, name == cur) { store.chooseWho(name); other = ""; store.say("Agora você é $name") }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(other, { other = it.take(40) }, singleLine = true, placeholder = { Text("Outro nome") },
                        modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
                    PrimaryButton("Sou eu") {
                        val n = other.trim()
                        if (n.isNotEmpty()) { store.chooseWho(n); store.say("Agora você é $n") }
                    }
                }
            }
        }

        // ---- freezers ----
        Section("Freezers")
        Card {
            Row2("Trocar prateleiras", "Criar, renomear, mudar a ordem ou excluir prateleiras e gavetas") { SettingsNav.shelves = true }
            com.nkoindustries.freezerino.data.FREEZERS.forEach { f ->
                Divider()
                Row2("Mapa do ${f.label}", "Onde fica cada prateleira") { open(Sheet.Map(f.id)) }
            }
        }

        // ---- notifications ----
        Section("Avisos")
        Card {
            Row2("Avisos de validade", if (store.pushOn) "Ativados neste celular" else "Desativados neste celular") { open(Sheet.Bell) }
        }

        // ---- account ----
        Section("Conta")
        Card {
            Row2("Sair", "Volta para a tela da senha da família") { store.signOut() }
        }
        Text("Freezerino ${BuildConfig.VERSION_NAME} · NKO Industries", color = p.muted, fontSize = 12.sp,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun Section(title: String) {
    Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = LocalPal.current.muted, modifier = Modifier.padding(top = 8.dp, start = 4.dp))
}

@Composable
private fun Row2(title: String, sub: String, onClick: () -> Unit) {
    val p = LocalPal.current
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, color = p.ink, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Text(sub, color = p.muted, fontSize = 13.sp)
        }
        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, null, tint = p.muted)
    }
}
