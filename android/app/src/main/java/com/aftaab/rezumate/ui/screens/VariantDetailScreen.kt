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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.ui.designsystem.RezDimens
import com.aftaab.rezumate.ui.designsystem.RezScreen
import com.aftaab.rezumate.ui.designsystem.RezTitleBar
import com.aftaab.rezumate.ui.theme.RezColors

data class VariantDetailUiState(
    val variantName: String,
    val atsScore: Int? = null,
    val resumeText: String? = null,
)

@Composable
fun VariantDetailScreen(
    state: VariantDetailUiState,
    modifier: Modifier = Modifier,
) {
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
