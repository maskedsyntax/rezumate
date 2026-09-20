package com.aftaab.rezumate.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.ui.designsystem.RezButton
import com.aftaab.rezumate.ui.designsystem.RezButtonKind
import com.aftaab.rezumate.ui.designsystem.RezCard
import com.aftaab.rezumate.ui.designsystem.RezChipFlow
import com.aftaab.rezumate.ui.designsystem.RezDimens
import com.aftaab.rezumate.ui.designsystem.RezIconTile
import com.aftaab.rezumate.ui.designsystem.RezProgressBar
import com.aftaab.rezumate.ui.designsystem.RezScreen
import com.aftaab.rezumate.ui.designsystem.RezSectionTitle
import com.aftaab.rezumate.ui.designsystem.RezStatusPill
import com.aftaab.rezumate.ui.designsystem.RezTitleBar
import com.aftaab.rezumate.ui.designsystem.rezScoreColor
import com.aftaab.rezumate.ui.theme.RezColors

data class ComponentScoreUi(
    val id: String,
    val label: String,
    val value: Int,
    val delta: Int? = null,
    val isExpanded: Boolean = false,
    val importance: String = "",
    val diagnosis: String = "",
)

data class ResumeBulletIssueUi(
    val text: String,
    val reasons: List<String>,
)

data class ResultsUiState(
    val score: Int,
    val isPro: Boolean = false,
    val isRefinementPending: Boolean = false,
    val isRefreshing: Boolean = false,
    val isOptimized: Boolean = false,
    val originalScore: Int? = null,
    val componentScores: List<ComponentScoreUi> = emptyList(),
    val bulletIssues: List<ResumeBulletIssueUi> = emptyList(),
    val formattingWarnings: List<String> = emptyList(),
    val missingSections: List<String> = emptyList(),
    val matchedKeywords: List<String> = emptyList(),
    val missingKeywords: List<String> = emptyList(),
    val partialMatches: List<String> = emptyList(),
    val jobTitle: String? = null,
    val jobTitleMatched: Boolean = false,
    val educationRequirement: String? = null,
    val educationMatched: Boolean = false,
    val proPriceText: String = "",
    val isPurchasing: Boolean = false,
    val purchaseMessage: String? = null,
    val remainingImprovements: Int = 3,
    val canImprove: Boolean = true,
    val isImproving: Boolean = false,
    val remainingImpactIssueCount: Int = 0,
    val canExport: Boolean = true,
    val isExporting: Boolean = false,
    val canUndoPlacement: Boolean = false,
    val lastPlacedKeyword: String? = null,
    val isPlacingKeyword: Boolean = false,
    val keywordDraft: KeywordPlacementDraft? = null,
    val exportWarnings: List<String> = emptyList(),
    val errorMessage: String? = null,
)

data class KeywordPlacementDraft(
    val keyword: String,
    val bullets: List<String>,
)

interface ResultsCallbacks {
    fun onRefresh()
    fun onUndoPlacement()
    fun onComponentScoreClick(id: String)
    fun onUnlockPro()
    fun onImproveResume()
    fun onExport()
    fun onKeywordClick(keyword: String)
    fun onConfirmPlacement(bullet: String?)
    fun onCancelPlacement()
    fun onConfirmExportAnyway()
    fun onCancelExportWarning()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultsScreen(
    state: ResultsUiState,
    callbacks: ResultsCallbacks,
    modifier: Modifier = Modifier,
) {
    if (state.keywordDraft != null) {
        ModalBottomSheet(
            onDismissRequest = callbacks::onCancelPlacement,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = RezColors.Background,
        ) {
            KeywordPlacementSheet(
                draft = state.keywordDraft,
                isWorking = state.isPlacingKeyword,
                onCancel = callbacks::onCancelPlacement,
                onConfirm = callbacks::onConfirmPlacement,
            )
        }
    }
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
            RezTitleBar(title = "Results") {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (state.canUndoPlacement) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clickable(
                                    enabled = !state.isPlacingKeyword && !state.isImproving,
                                    role = Role.Button,
                                    onClick = callbacks::onUndoPlacement,
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Undo,
                                contentDescription = "Undo last keyword",
                                tint = RezColors.Ink,
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clickable(
                                enabled = !state.isRefreshing,
                                role = Role.Button,
                                onClick = callbacks::onRefresh,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (state.isRefreshing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = RezColors.Ink,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Re-analyze",
                                tint = RezColors.Ink,
                            )
                        }
                    }
                }
            }
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    start = RezDimens.ScreenPadding,
                    top = RezDimens.ScreenPadding,
                    end = RezDimens.ScreenPadding,
                    bottom = 180.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                if (state.isRefinementPending) {
                    item { RefinementNotice() }
                }
                item { ScoreHeader(state) }
                item { ComponentScoresCard(state, callbacks::onComponentScoreClick) }
                if (!state.jobTitle.isNullOrBlank() || !state.educationRequirement.isNullOrBlank()) {
                    item { RoleFitCard(state) }
                }
                item {
                    TappableKeywordCard(
                        title = "Missing hard skills",
                        subtitle = "Tap a skill you actually have to add it.",
                        items = state.missingKeywords,
                        color = RezColors.Warning,
                        isPro = state.isPro,
                        limitForFree = 5,
                        lastPlacedKeyword = state.lastPlacedKeyword,
                        onKeywordClick = callbacks::onKeywordClick,
                    )
                }
                item {
                    TappableKeywordCard(
                        title = "Partial matches",
                        subtitle = "Close — add the exact term if you have it.",
                        items = state.partialMatches,
                        color = RezColors.BlueWash,
                        isPro = state.isPro,
                        limitForFree = 5,
                        lastPlacedKeyword = null,
                        onKeywordClick = callbacks::onKeywordClick,
                    )
                }
                item {
                    KeywordCard(
                        title = "Matched keywords",
                        items = state.matchedKeywords,
                        color = RezColors.Success,
                        isPro = state.isPro,
                    )
                }
                item { NeedsAttentionCard(state) }
                if (!state.isPro) {
                    item { ProInsightsCard(state, callbacks::onUnlockPro) }
                }
                item { ImproveResumeCard(state, callbacks) }
                item { ExportCard(state, callbacks) }
                if (state.errorMessage != null) {
                    item { ErrorNotice(state.errorMessage) }
                }
            }
        }
    }
}

@Composable
private fun RefinementNotice() {
    RezCard(modifier = Modifier.fillMaxWidth(), contentPadding = 14.dp) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = RezColors.Ink,
                strokeWidth = 2.dp,
            )
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = "Refinement running",
                    color = RezColors.Ink,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                )
                Text(
                    text = "Showing a fast baseline while local suggestions update the report.",
                    color = RezColors.Muted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun ScoreHeader(state: ResultsUiState) {
    RezCard(modifier = Modifier.fillMaxWidth(), contentPadding = 18.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(104.dp)
                    .background(rezScoreColor(state.score), RoundedCornerShape(8.dp))
                    .border(2.dp, RezColors.Ink, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = state.score.toString(),
                        color = RezColors.Ink,
                        fontSize = 42.sp,
                        lineHeight = 44.sp,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        text = "/100",
                        color = RezColors.Ink,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
            Spacer(Modifier.width(18.dp))
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "ATS SCORE",
                        color = RezColors.Ink,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                    )
                    if (state.isOptimized) {
                        Text(
                            text = "OPTIMIZED",
                            modifier = Modifier
                                .background(RezColors.Success, RoundedCornerShape(3.dp))
                                .padding(horizontal = 5.dp, vertical = 2.dp),
                            color = RezColors.Ink,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
                if (state.originalScore != null) {
                    ScoreDelta(original = state.originalScore, current = state.score)
                } else {
                    Text(
                        text = scoreMessage(state.score),
                        color = RezColors.Muted,
                        fontSize = 14.sp,
                        lineHeight = 19.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun ScoreDelta(original: Int, current: Int) {
    val delta = current - original
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = original.toString(),
            color = RezColors.Muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            textDecoration = TextDecoration.LineThrough,
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
            contentDescription = null,
            tint = RezColors.Muted,
            modifier = Modifier.size(12.dp),
        )
        Text(
            text = current.toString(),
            color = RezColors.Ink,
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
        )
        Text(
            text = if (delta > 0) "+$delta" else "unchanged",
            color = if (delta > 0) RezColors.Success else RezColors.Muted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Black,
        )
    }
}

@Composable
private fun ComponentScoresCard(
    state: ResultsUiState,
    onScoreClick: (String) -> Unit,
) {
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(
            title = "Score breakdown",
            subtitle = if (state.isPro) {
                "Tap a score for details & diagnosis"
            } else {
                "Free includes the score breakdown. Pro unlocks full diagnosis."
            },
        )
        Column(modifier = Modifier.padding(top = 16.dp)) {
            state.componentScores.forEachIndexed { index, score ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(role = Role.Button) { onScoreClick(score.id) }
                        .padding(vertical = 7.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = score.label,
                            modifier = Modifier.weight(1f),
                            color = RezColors.Ink,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = score.value.toString(),
                            color = RezColors.Ink,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        if (score.delta != null && score.delta != 0) {
                            Text(
                                text = if (score.delta > 0) "+${score.delta}" else score.delta.toString(),
                                modifier = Modifier.padding(start = 4.dp),
                                color = if (score.delta > 0) RezColors.Success else RezColors.Error,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                            )
                        }
                        Icon(
                            imageVector = if (!state.isPro) {
                                Icons.Default.Lock
                            } else if (score.isExpanded) {
                                Icons.Default.ExpandLess
                            } else {
                                Icons.Default.ExpandMore
                            },
                            contentDescription = null,
                            tint = RezColors.Muted,
                            modifier = Modifier
                                .padding(start = 4.dp)
                                .size(15.dp),
                        )
                    }
                    RezProgressBar(
                        progress = score.value / 100f,
                        color = rezScoreColor(score.value),
                        height = 8.dp,
                    )
                    if (state.isPro && score.isExpanded) {
                        ScoreDiagnosis(score)
                    }
                }
                if (index != state.componentScores.lastIndex) {
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 4.dp),
                        color = RezColors.Ink.copy(alpha = 0.2f),
                    )
                }
            }
        }
    }
}

@Composable
private fun ScoreDiagnosis(score: ComponentScoreUi) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Background, RoundedCornerShape(6.dp))
            .border(1.5.dp, RezColors.Ink, RoundedCornerShape(6.dp))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        DiagnosisCopy("WHY IT MATTERS", score.importance)
        HorizontalDivider(color = RezColors.Ink)
        DiagnosisCopy("DIAGNOSIS & FEEDBACK", score.diagnosis)
    }
}

@Composable
private fun DiagnosisCopy(label: String, copy: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = label,
            color = RezColors.Muted,
            fontSize = 8.sp,
            fontWeight = FontWeight.Black,
        )
        Text(text = copy, color = RezColors.Ink, fontSize = 12.sp, lineHeight = 16.sp)
    }
}

@Composable
private fun NeedsAttentionCard(state: ResultsUiState) {
    val visibleBulletIssues = if (state.isPro) state.bulletIssues else state.bulletIssues.take(2)
    val hiddenBulletCount = state.bulletIssues.size - visibleBulletIssues.size
    val totalIssueCount = state.bulletIssues.size +
        state.formattingWarnings.size +
        state.missingSections.size

    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(
            title = "Needs attention",
            subtitle = if (totalIssueCount == 0) {
                "No major wording, impact, formatting, or section signals were found."
            } else {
                "Specific signals to review before you send this resume."
            },
        )
        Column(
            modifier = Modifier.padding(top = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (totalIssueCount == 0) {
                PassedIssueChecks()
            } else {
                if (visibleBulletIssues.isNotEmpty()) {
                    IssueGroupHeader(
                        title = "Bullet issues",
                        subtitle = "These lines may undersell your work.",
                        icon = Icons.AutoMirrored.Filled.FormatListBulleted,
                    )
                    visibleBulletIssues.forEach { issue -> BulletIssueRow(issue) }
                    if (hiddenBulletCount > 0) {
                        Text(
                            text = "+$hiddenBulletCount more bullet issue${if (hiddenBulletCount == 1) "" else "s"} included with Pro",
                            color = RezColors.Muted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
                if (state.formattingWarnings.isNotEmpty()) {
                    if (visibleBulletIssues.isNotEmpty()) {
                        HorizontalDivider(color = RezColors.Ink.copy(alpha = 0.2f))
                    }
                    IssueGroupHeader(
                        title = "Formatting risks",
                        subtitle = "Review these extraction signals before exporting.",
                        icon = Icons.Default.Description,
                    )
                    state.formattingWarnings.forEach { warning -> IssueWarningRow(warning) }
                }
                if (state.missingSections.isNotEmpty()) {
                    if (visibleBulletIssues.isNotEmpty() || state.formattingWarnings.isNotEmpty()) {
                        HorizontalDivider(color = RezColors.Ink.copy(alpha = 0.2f))
                    }
                    IssueGroupHeader(
                        title = "Sections not detected",
                        subtitle = "Use a clear heading if a section belongs in your resume.",
                        icon = Icons.Default.Description,
                    )
                    RezChipFlow(
                        items = state.missingSections.map(String::uppercase),
                        color = RezColors.Violet,
                    )
                }
            }
        }
    }
}

@Composable
private fun PassedIssueChecks() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Success.copy(alpha = 0.35f), RoundedCornerShape(6.dp))
            .border(1.5.dp, RezColors.Ink, RoundedCornerShape(6.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = RezColors.Success,
            modifier = Modifier.size(19.dp),
        )
        Text(
            text = "Your resume passed the issue checks available in this analysis. Review the keyword match below for role-specific gaps.",
            modifier = Modifier.weight(1f),
            color = RezColors.Ink,
            fontSize = 14.sp,
            lineHeight = 19.sp,
        )
    }
}

@Composable
private fun IssueGroupHeader(title: String, subtitle: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
        RezIconTile(
            icon = icon,
            background = RezColors.BlueWash,
            modifier = Modifier.size(32.dp),
        )
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = title,
                color = RezColors.Ink,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
            )
            Text(text = subtitle, color = RezColors.Muted, fontSize = 12.sp, lineHeight = 16.sp)
        }
    }
}

@Composable
private fun BulletIssueRow(issue: ResumeBulletIssueUi) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Background, RoundedCornerShape(6.dp))
            .border(1.5.dp, RezColors.Ink, RoundedCornerShape(6.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        Text(
            text = "\u201c${issue.text}\u201d",
            color = RezColors.Ink,
            fontSize = 14.sp,
            lineHeight = 19.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            issue.reasons.forEach { reason ->
                Text(
                    text = reason,
                    modifier = Modifier
                        .background(
                            if (reason == "WEAK WORDING") RezColors.Error else RezColors.Warning,
                            RoundedCornerShape(3.dp),
                        )
                        .border(1.5.dp, RezColors.Ink, RoundedCornerShape(3.dp))
                        .padding(horizontal = 7.dp, vertical = 4.dp),
                    color = RezColors.Ink,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Black,
                )
            }
        }
    }
}

@Composable
private fun IssueWarningRow(warning: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Warning.copy(alpha = 0.55f), RoundedCornerShape(5.dp))
            .border(1.5.dp, RezColors.Ink, RoundedCornerShape(5.dp))
            .padding(10.dp),
        horizontalArrangement = Arrangement.spacedBy(9.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            imageVector = Icons.Default.WarningAmber,
            contentDescription = null,
            tint = RezColors.Ink,
            modifier = Modifier.size(15.dp),
        )
        Text(
            text = warning,
            modifier = Modifier.weight(1f),
            color = RezColors.Ink,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun ProInsightsCard(state: ResultsUiState, onUnlockPro: () -> Unit) {
    RezCard(modifier = Modifier.fillMaxWidth(), contentPadding = 14.dp) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
            RezIconTile(
                icon = Icons.Default.LockOpen,
                background = RezColors.Violet,
                modifier = Modifier.size(38.dp),
            )
            RezSectionTitle(
                title = "Unlock full diagnosis",
                modifier = Modifier.weight(1f),
                subtitle = "One-time Pro unlock for ${state.proPriceText}. Get every keyword, detailed score reasoning, and unlimited local improvements.",
            )
        }
        RezButton(
            text = if (state.isPurchasing) "Unlocking..." else "Unlock Pro",
            onClick = onUnlockPro,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            kind = RezButtonKind.Secondary,
            fill = RezColors.Warning,
            enabled = !state.isPurchasing,
            leadingIcon = Icons.Default.AutoAwesome,
        )
        if (state.purchaseMessage != null) {
            Text(
                text = state.purchaseMessage,
                modifier = Modifier.padding(top = 8.dp),
                color = RezColors.Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun KeywordCard(title: String, items: List<String>, color: androidx.compose.ui.graphics.Color, isPro: Boolean) {
    val visibleItems = if (isPro) items else items.take(6)
    val hiddenCount = items.size - visibleItems.size
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(title)
        if (visibleItems.isEmpty()) {
            Text(
                text = "Nothing to show yet.",
                modifier = Modifier.padding(top = 12.dp),
                color = RezColors.Muted,
                fontSize = 14.sp,
            )
        } else {
            RezChipFlow(
                items = visibleItems,
                color = color,
                modifier = Modifier.padding(top = 12.dp),
            )
            if (hiddenCount > 0) {
                Text(
                    text = "+$hiddenCount more included with Pro",
                    modifier = Modifier.padding(top = 10.dp),
                    color = RezColors.Muted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                )
            }
        }
    }
}

@Composable
private fun ImproveResumeCard(state: ResultsUiState, callbacks: ResultsCallbacks) {
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(
            title = "Improve Resume",
            subtitle = "Optimize content and format in the standard resume template.",
        )
        Column(
            modifier = Modifier.padding(top = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (!state.isOptimized) {
                if (!state.isPro) {
                    Text(
                        text = "${state.remainingImprovements} free improvements left today.",
                        color = RezColors.Muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                RezButton(
                    text = if (state.isImproving) "Improving..." else "Improve Resume",
                    onClick = callbacks::onImproveResume,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.isImproving && state.canImprove,
                    leadingIcon = Icons.Default.AutoAwesome,
                )
                if (!state.canImprove) {
                    RezButton(
                        text = "Unlock unlimited improvements",
                        onClick = callbacks::onUnlockPro,
                        modifier = Modifier.fillMaxWidth(),
                        kind = RezButtonKind.Secondary,
                        fill = RezColors.Warning,
                        enabled = !state.isPurchasing,
                        leadingIcon = Icons.Default.LockOpen,
                    )
                }
                if (state.purchaseMessage != null) {
                    Text(
                        text = state.purchaseMessage,
                        color = RezColors.Muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = RezColors.Success,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = "Resume improved and formatted",
                        color = RezColors.Ink,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                if (state.originalScore != null) {
                    Text(
                        text = buildString {
                            append("Score ${state.originalScore} to ${state.score}")
                            val delta = state.score - state.originalScore
                            if (delta > 0) append(" (+$delta pts)")
                            if (delta == 0) append(" (wording improved; review before sending)")
                        },
                        color = RezColors.Muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Text(
                    text = if (state.remainingImpactIssueCount == 0) {
                        "Wording is improved. Review and export the final PDF."
                    } else {
                        "${state.remainingImpactIssueCount} bullet(s) may still need stronger impact details. Review before sending."
                    },
                    color = RezColors.Muted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                )
            }
        }
    }
}

@Composable
private fun RoleFitCard(state: ResultsUiState) {
    val rows = buildList {
        state.jobTitle?.takeIf(String::isNotBlank)?.let {
            add(Triple("Job title", it, state.jobTitleMatched))
        }
        state.educationRequirement?.takeIf(String::isNotBlank)?.let {
            add(Triple("Education", it, state.educationMatched))
        }
    }
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(
            title = "Role fit",
            subtitle = "Checked against this job description. Not added to your resume automatically.",
        )
        Column(
            modifier = Modifier.padding(top = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            rows.forEach { (label, value, matched) ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(
                        imageVector = if (matched) Icons.Default.CheckCircle else Icons.Default.WarningAmber,
                        contentDescription = null,
                        tint = if (matched) RezColors.Success else RezColors.Muted,
                        modifier = Modifier.size(16.dp),
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(label, color = RezColors.Ink, fontSize = 12.sp, fontWeight = FontWeight.Black)
                        Text(value, color = RezColors.Muted, fontSize = 12.sp)
                    }
                    RezStatusPill(
                        text = if (matched) "MATCHED" else "MISSING",
                        color = if (matched) RezColors.Success else RezColors.Warning,
                    )
                }
            }
        }
    }
}

@Composable
private fun TappableKeywordCard(
    title: String,
    subtitle: String,
    items: List<String>,
    color: androidx.compose.ui.graphics.Color,
    isPro: Boolean,
    limitForFree: Int,
    lastPlacedKeyword: String?,
    onKeywordClick: (String) -> Unit,
) {
    val visibleItems = if (isPro) items else items.take(limitForFree)
    val hiddenCount = items.size - visibleItems.size
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(title = title, subtitle = subtitle)
        if (lastPlacedKeyword != null) {
            Text(
                text = "Added ${com.aftaab.rezumate.domain.ResumeTailoringService.displayName(lastPlacedKeyword)}. Score updated.",
                modifier = Modifier.padding(top = 10.dp),
                color = RezColors.Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
        if (visibleItems.isEmpty()) {
            Text(
                text = "Nothing to show yet.",
                modifier = Modifier.padding(top = 12.dp),
                color = RezColors.Muted,
                fontSize = 14.sp,
            )
        } else {
            RezChipFlow(
                items = visibleItems,
                color = color,
                modifier = Modifier.padding(top = 12.dp),
                tappable = true,
                onItemClick = onKeywordClick,
            )
            if (hiddenCount > 0) {
                Text(
                    text = "+$hiddenCount more included with Pro",
                    modifier = Modifier.padding(top = 10.dp),
                    color = RezColors.Muted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                )
            }
        }
    }
}

@Composable
private fun ExportCard(state: ResultsUiState, callbacks: ResultsCallbacks) {
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(
            title = "Export PDF",
            subtitle = "Preview a clean ATS-friendly PDF before sharing it.",
        )
        RezButton(
            text = if (state.isExporting) "Preparing PDF..." else "Preview & Export PDF",
            onClick = callbacks::onExport,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            kind = RezButtonKind.Secondary,
            fill = RezColors.BlueWash,
            enabled = state.canExport && !state.isExporting && !state.isImproving,
            leadingIcon = Icons.Default.Description,
        )
    }
}

@Composable
private fun KeywordPlacementSheet(
    draft: KeywordPlacementDraft,
    isWorking: Boolean,
    onCancel: () -> Unit,
    onConfirm: (String?) -> Unit,
) {
    var selectedBullet by remember(draft.keyword) { mutableStateOf<String?>(null) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp)
            .padding(bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = com.aftaab.rezumate.domain.ResumeTailoringService.displayName(draft.keyword),
            color = RezColors.Ink,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
        )
        Text(
            text = "Only add this if you actually have it. Rezumate will put it in Skills and will not invent experience, metrics, or employers.",
            color = RezColors.Muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
        if (draft.bullets.isNotEmpty()) {
            Text("Optional proof bullet", color = RezColors.Ink, fontSize = 12.sp, fontWeight = FontWeight.Black)
            Text(
                text = "Pick an existing bullet to mention this skill. Skip this to add it only to Skills.",
                color = RezColors.Muted,
                fontSize = 12.sp,
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 280.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                draft.bullets.forEach { bullet ->
                    val selected = selectedBullet == bullet
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(if (selected) RezColors.BlueWash else RezColors.Background, RoundedCornerShape(6.dp))
                            .border(1.5.dp, RezColors.Ink, RoundedCornerShape(6.dp))
                            .clickable(role = Role.Button) {
                                selectedBullet = if (selected) null else bullet
                            }
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(if (selected) "☑" else "☐", color = RezColors.Ink, fontWeight = FontWeight.Black)
                        Text(bullet, color = RezColors.Ink, fontSize = 12.sp, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
        RezButton(
            text = if (isWorking) "Adding..." else "Add to Skills",
            onClick = { onConfirm(selectedBullet) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isWorking,
        )
        RezButton(
            text = "Cancel",
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth(),
            kind = RezButtonKind.Secondary,
            enabled = !isWorking,
        )
    }
}

@Composable
private fun ErrorNotice(message: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Error, RoundedCornerShape(6.dp))
            .border(2.dp, RezColors.Ink, RoundedCornerShape(6.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(9.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            imageVector = Icons.Default.WarningAmber,
            contentDescription = null,
            tint = RezColors.Ink,
            modifier = Modifier.size(19.dp),
        )
        Text(
            text = message,
            modifier = Modifier.weight(1f),
            color = RezColors.Ink,
            fontSize = 14.sp,
            lineHeight = 19.sp,
            maxLines = 4,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private fun scoreMessage(score: Int): String = when (score) {
    in 80..100 -> "Strong fit. Polish missing details and export."
    in 60..79 -> "Good base. Close keyword and impact gaps."
    else -> "Needs tailoring before sending."
}
