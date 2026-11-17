package com.nkoindustries.freezerino

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.nkoindustries.freezerino.ui.FreezerinoRoot
import com.nkoindustries.freezerino.ui.FreezerinoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val store = (application as FreezerinoApp).store
        setContent { FreezerinoTheme { FreezerinoRoot(store) } }
    }

    override fun onPause() {
        super.onPause()
        // write any +/− taps still waiting
        val store = (application as FreezerinoApp).store
        store.pending.keys.toList().forEach { store.flush(it) }
    }
}
