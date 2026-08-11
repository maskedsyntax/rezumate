package com.aftaab.rezumate.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

object RezColors {
    val Background = Color(0xFFF4F1E9)
    val Surface = Color.White
    val Ink = Color(0xFF090909)
    val Muted = Color(0xFF4B4B43)
    val Link = Color(0xFF146EF5)
    val Success = Color(0xFF89DC5F)
    val Warning = Color(0xFFFFD84D)
    val Error = Color(0xFFFF6B5F)
    val Violet = Color(0xFFC7A3FF)
    val BlueWash = Color(0xFFE8F1FF)
}

private val RezumateColors = lightColorScheme(
    primary = RezColors.Ink,
    onPrimary = Color.White,
    background = RezColors.Background,
    onBackground = RezColors.Ink,
    surface = RezColors.Surface,
    onSurface = RezColors.Ink,
    error = RezColors.Error,
    onError = RezColors.Ink,
)

@Composable
fun RezumateTheme(content: @Composable () -> Unit) {
    @Suppress("UNUSED_VARIABLE")
    val ignoredDarkMode = isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = RezumateColors,
        content = content,
    )
}
