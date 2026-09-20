package com.aftaab.rezumate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.ui.designsystem.RezButton
import com.aftaab.rezumate.ui.designsystem.RezDimens
import com.aftaab.rezumate.ui.designsystem.RezScreen
import com.aftaab.rezumate.ui.designsystem.RezTitleBar
import com.aftaab.rezumate.ui.theme.RezColors

data class VariantDetailUiState(
    val variantName: String,
    val atsScore: Int? = null,
    val resumeText: String? = null,
    val isExporting: Boolean = false,
    val exportWarnings: List<String> = emptyList(),
    val errorMessage: String? = null,
)

interface VariantDetailCallbacks {
    fun onExport()
    fun onConfirmExportAnyway()
    fun onCancelExportWarning()
}

@Composable
fun VariantDetailScreen(
    state: VariantDetailUiState,
    callbacks: VariantDetailCallbacks,
    modifier: Modifier = Modifier,
) {
    if (state.exportWarnings.isNotEmpty()) {
        AlertDialog(
            onDismissRequest = callbacks::onCancelExportWarning,
            title = { Text("Review before export") },
            text = { Text(state.exportWarnings.joinToString("\n")) },
            confirmButton = {
                TextButton(onClick = callbacks::onConfirmExportAnyway) { Text("Preview Anyway") }
            },
            dismissButton = {
                TextButton(onClick = callbacks::onCancelExportWarning) { Text("Cancel") }
            },
        )
    }
    RezScreen(modifier) {
        Column {
            RezTitleBar(title = "Variant")
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(RezDimens.ScreenPadding),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = state.variantName,
                    color = RezColors.Ink,
                    fontSize = 22.sp,
                    lineHeight = 27.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Score ${state.atsScore ?: 0}",
                    color = RezColors.Muted,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                RezButton(
                    text = if (state.isExporting) "Preparing PDF..." else "Preview & Export PDF",
                    onClick = callbacks::onExport,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.isExporting,
                )
                if (state.errorMessage != null) {
                    Text(
                        text = state.errorMessage,
                        color = RezColors.Ink,
                        fontSize = 12.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(RezColors.Error, RoundedCornerShape(6.dp))
                            .border(2.dp, RezColors.Ink, RoundedCornerShape(6.dp))
                            .padding(12.dp),
                    )
                }
                SelectionContainer {
                    Text(
                        text = state.resumeText ?: "No resume text saved for this variant.",
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(RezColors.Surface, RoundedCornerShape(8.dp))
                            .border(2.dp, RezColors.Ink, RoundedCornerShape(8.dp))
                            .padding(14.dp),
                        color = RezColors.Ink,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        fontFamily = FontFamily.Monospace,
                    )
                }
            }
        }
    }
}
