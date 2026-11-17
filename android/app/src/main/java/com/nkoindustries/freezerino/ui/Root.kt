package com.nkoindustries.freezerino.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Kitchen
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nkoindustries.freezerino.data.Store
import kotlinx.coroutines.launch

/** Which bottom sheet is open. */
sealed interface Sheet {
    data class ItemEdit(val id: String?, val name: String? = null, val place: String? = null, val fromShop: String? = null) : Sheet
    data object Filter : Sheet
    data class Map(val freezer: String) : Sheet
    data object Who : Sheet
    data object Bell : Sheet
    data class PlaceEdit(val id: String?) : Sheet
}

enum class Tab(val title: String) { FREEZER("Freezerino"), COMPRAS("Compras"), HISTORICO("Histórico"), PRATELEIRAS("Prateleiras") }

@Composable
fun FreezerinoRoot(store: Store) {
    val p = LocalPal.current
    Box(Modifier.fillMaxSize().background(p.bg)) {
        if (!store.signedIn) LoginScreen(store) else MainScreen(store)
    }
}

@Composable
private fun LoginScreen(store: Store) {
    val p = LocalPal.current
    var pw by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val go = {
        if (pw.isNotEmpty() && !busy) {
            busy = true; err = null
            scope.launch { err = store.signIn(pw); busy = false; if (err == null) pw = "" }
        }
    }
    Column(
        Modifier.fillMaxSize().statusBarsPadding().imePadding().padding(24.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("❄️", fontSize = 48.sp)
        Text("Freezerino", fontSize = 30.sp, fontWeight = FontWeight.Bold, color = p.ink)
        Text("A lista do freezer da família", color = p.muted)
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = pw, onValueChange = { pw = it }, label = { Text("Senha da família") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Go),
            keyboardActions = KeyboardActions(onGo = { go() }),
            modifier = Modifier.fillMaxWidth().widthIn(max = 420.dp),
        )
        (err ?: store.loginNote)?.let { Text(it, color = p.danger, modifier = Modifier.padding(top = 8.dp)) }
        Spacer(Modifier.height(12.dp))
        Button(onClick = { go() }, enabled = !busy, modifier = Modifier.fillMaxWidth().widthIn(max = 420.dp).height(50.dp)) {
            Text(if (busy) "Entrando…" else "Entrar", fontSize = 16.sp)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScreen(store: Store) {
    val p = LocalPal.current
    var tab by rememberSaveable { mutableStateOf(Tab.FREEZER) }
    var sheet by remember { mutableStateOf<Sheet?>(null) }
    val snack = remember { SnackbarHostState() }

    LaunchedEffect(store.toast) {
        val msg = store.toast ?: return@LaunchedEffect
        store.toast = null
        snack.currentSnackbarData?.dismiss()
        snack.showSnackbar(msg)
    }
    // first time on this phone: who uses it (for the history)
    LaunchedEffect(store.ready, store.who) {
        if (store.ready && store.who == null && sheet == null) sheet = Sheet.Who
    }

    val al = store.alerts()
    val openShop = store.shopping.values.count { !it.done }

    Scaffold(
        containerColor = p.bg,
        snackbarHost = { SnackbarHost(snack) },
        topBar = {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(start = 18.dp, end = 8.dp, top = 10.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(tab.title, fontSize = 28.sp, fontWeight = FontWeight.Bold, color = p.ink)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(if (store.synced) p.ok else p.out))
                        Text(store.status, fontSize = 13.sp, color = p.muted, modifier = Modifier.padding(start = 6.dp))
                    }
                }
                IconButton(onClick = { sheet = Sheet.Bell }) {
                    Icon(if (store.pushOn) Icons.Outlined.NotificationsActive else Icons.Outlined.Notifications,
                        contentDescription = "Avisos de validade", tint = if (store.pushOn) p.accent else p.muted)
                }
                TextButton(onClick = { store.signOut() }) { Text("Sair", color = p.muted) }
            }
        },
        bottomBar = {
            NavigationBar(containerColor = p.surface) {
                val colors = NavigationBarItemDefaults.colors(selectedIconColor = p.accent, selectedTextColor = p.accent,
                    indicatorColor = p.accentSoft, unselectedIconColor = p.muted, unselectedTextColor = p.muted)
                @Composable fun item(t: Tab, label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, badge: Int) =
                    NavigationBarItem(selected = tab == t, onClick = { tab = t }, colors = colors, label = { Text(label) },
                        icon = {
                            BadgedBox(badge = { if (badge > 0) Badge(containerColor = p.danger) { Text("$badge") } }) {
                                Icon(icon, contentDescription = null)
                            }
                        })
                item(Tab.FREEZER, "Freezer", Icons.Outlined.Kitchen, al.bad.size)
                item(Tab.COMPRAS, "Compras", Icons.Outlined.ShoppingCart, openShop)
                item(Tab.HISTORICO, "Histórico", Icons.Outlined.History, 0)
                item(Tab.PRATELEIRAS, "Prateleiras", Icons.Outlined.Tune, 0)
            }
        },
        floatingActionButton = {
            if (tab == Tab.FREEZER) ExtendedFloatingActionButton(
                onClick = { sheet = Sheet.ItemEdit(null) }, containerColor = p.accent, contentColor = p.accentInk,
                shape = RoundedCornerShape(28.dp),
            ) { Text("+ Adicionar", fontWeight = FontWeight.SemiBold, fontSize = 16.sp) }
        },
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            when (tab) {
                Tab.FREEZER -> FreezerScreen(store, open = { sheet = it }, goShelves = { tab = Tab.PRATELEIRAS })
                Tab.COMPRAS -> ShoppingScreen(store, open = { sheet = it })
                Tab.HISTORICO -> HistoryScreen(store, open = { sheet = it })
                Tab.PRATELEIRAS -> ShelvesScreen(store, open = { sheet = it })
            }
        }
    }

    sheet?.let { s ->
        val close = { sheet = null }
        when (s) {
            is Sheet.ItemEdit -> ItemSheet(store, s, close, goShelves = { sheet = null; tab = Tab.PRATELEIRAS })
            Sheet.Filter -> FilterSheet(store, close)
            is Sheet.Map -> MapSheet(store, s.freezer, close)
            Sheet.Who -> WhoSheet(store, close)
            Sheet.Bell -> BellSheet(store, close)
            is Sheet.PlaceEdit -> PlaceSheet(store, s.id, close)
        }
    }
}
