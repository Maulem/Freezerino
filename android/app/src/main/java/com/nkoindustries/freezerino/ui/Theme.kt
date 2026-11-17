package com.nkoindustries.freezerino.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/** Same colours as style.css on the website. */
data class Pal(
    val bg: Color, val surface: Color, val ink: Color, val muted: Color, val line: Color,
    val accent: Color, val accentInk: Color, val accentSoft: Color, val frost: Color,
    val warn: Color, val warnSoft: Color, val out: Color, val danger: Color, val dangerSoft: Color, val ok: Color,
)

val LightPal = Pal(
    bg = Color(0xFFEEF3F6), surface = Color.White, ink = Color(0xFF15232C), muted = Color(0xFF5D707C), line = Color(0xFFD6E1E8),
    accent = Color(0xFF1F5F8B), accentInk = Color.White, accentSoft = Color(0xFFDCEBF5), frost = Color(0xFFF6FAFC),
    warn = Color(0xFF9A5B00), warnSoft = Color(0xFFFFF1D6), out = Color(0xFF8A96A0), danger = Color(0xFFB3261E),
    dangerSoft = Color(0xFFFDE7E5), ok = Color(0xFF2E9D5B),
)
val DarkPal = Pal(
    bg = Color(0xFF0E171D), surface = Color(0xFF16232B), ink = Color(0xFFE4EDF2), muted = Color(0xFF93A6B2), line = Color(0xFF26363F),
    accent = Color(0xFF7CB8E0), accentInk = Color(0xFF0B1A24), accentSoft = Color(0xFF1D3444), frost = Color(0xFF121E25),
    warn = Color(0xFFF0B860), warnSoft = Color(0xFF3A2A10), out = Color(0xFF6C7D88), danger = Color(0xFFFF8A80),
    dangerSoft = Color(0xFF3A1A18), ok = Color(0xFF5CC98A),
)

val LocalPal = staticCompositionLocalOf { LightPal }

@Composable
fun FreezerinoTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val p = if (dark) DarkPal else LightPal
    val scheme = (if (dark) darkColorScheme() else lightColorScheme()).copy(
        primary = p.accent, onPrimary = p.accentInk, primaryContainer = p.accentSoft, onPrimaryContainer = p.ink,
        secondaryContainer = p.accentSoft, onSecondaryContainer = p.ink,
        background = p.bg, onBackground = p.ink, surface = p.surface, onSurface = p.ink,
        surfaceVariant = p.frost, onSurfaceVariant = p.muted, outline = p.line, outlineVariant = p.line,
        surfaceContainer = p.surface, surfaceContainerLow = p.surface, surfaceContainerHigh = p.surface,
        surfaceContainerHighest = p.frost, error = p.danger,
    )
    CompositionLocalProvider(LocalPal provides p) { MaterialTheme(colorScheme = scheme, content = content) }
}
