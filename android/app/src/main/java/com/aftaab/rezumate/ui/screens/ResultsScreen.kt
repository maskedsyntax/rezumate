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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
    val proPriceText: String = "",
    val isPurchasing: Boolean = false,
    val purchaseMessage: String? = null,
    val remainingImprovements: Int = 3,
    val canImprove: Boolean = true,
    val isImproving: Boolean = false,
    val remainingImpactIssueCount: Int = 0,
    val canViewExport: Boolean = false,
    val errorMessage: String? = null,
)

interface ResultsCallbacks {
    fun onRefresh()
    fun onComponentScoreClick(id: String)
    fun onUnlockPro()
    fun onImproveResume()
    fun onViewAndDownloadResume()
}

@Composable
fun ResultsScreen(
    state: ResultsUiState,
    callbacks: ResultsCallbacks,
    modifier: Modifier = Modifier,
) {
    RezScreen(modifier) {
        Column {
            RezTitleBar(title = "Results") {
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
                item { NeedsAttentionCard(state) }
                if (!state.isPro) {
                    item { ProInsightsCard(state, callbacks::onUnlockPro) }
                }
                item {
                    KeywordCard(
                        title = "Matched keywords",
                        items = state.matchedKeywords,
                        color = RezColors.Success,
                        isPro = state.isPro,
                    )
                }
                item {
                    KeywordCard(
                        title = "Missing keywords",
                        items = state.missingKeywords,
                        color = RezColors.Warning,
                        isPro = state.isPro,
                    )
                }
                item { ImproveResumeCard(state, callbacks) }
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
                        "Keywords, wording, and impact signals are improved. Review and export the final PDF."
                    } else {
                        "${state.remainingImpactIssueCount} bullet(s) may still need stronger impact details. Review before sending."
                    },
                    color = RezColors.Muted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                )
                RezButton(
                    text = "View & Download Resume",
                    onClick = callbacks::onViewAndDownloadResume,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = state.canViewExport,
                    leadingIcon = Icons.Default.FileDownload,
                )
            }
        }
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
