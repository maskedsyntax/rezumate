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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.ui.designsystem.RezButton
import com.aftaab.rezumate.ui.designsystem.RezButtonKind
import com.aftaab.rezumate.ui.designsystem.RezCard
import com.aftaab.rezumate.ui.designsystem.RezDashedPanel
import com.aftaab.rezumate.ui.designsystem.RezDimens
import com.aftaab.rezumate.ui.designsystem.RezIconTile
import com.aftaab.rezumate.ui.designsystem.RezPanel
import com.aftaab.rezumate.ui.designsystem.RezProgressBar
import com.aftaab.rezumate.ui.designsystem.RezScreen
import com.aftaab.rezumate.ui.designsystem.RezSectionTitle
import com.aftaab.rezumate.ui.designsystem.RezStatusPill
import com.aftaab.rezumate.ui.designsystem.rezScoreColor
import com.aftaab.rezumate.ui.theme.RezColors

data class UploadedResumeUi(
    val filename: String,
    val characterCount: Int,
    val warnings: List<String> = emptyList(),
)

data class AnalyzeUiState(
    val latestScore: Int? = null,
    val planName: String = "Free plan",
    val isPro: Boolean = false,
    val remainingAnalyses: Int = 3,
    val remainingImprovements: Int = 3,
    val savedVariantCount: Int = 0,
    val savedVariantLimit: Int = 2,
    val upload: UploadedResumeUi? = null,
    val isUploading: Boolean = false,
    val isUploadTargeted: Boolean = false,
    val jobDescription: String = "",
    val jobDescriptionLimit: Int = 5_000,
    val isAnalyzing: Boolean = false,
    val canAnalyze: Boolean = true,
    val isPurchasing: Boolean = false,
    val purchaseMessage: String? = null,
    val noticeMessage: String? = null,
)

interface AnalyzeCallbacks {
    fun onPickResume()
    fun onRemoveResume()
    fun onJobDescriptionChange(value: String)
    fun onPasteFromClipboard()
    fun onAnalyze()
    fun onUnlockPro()
}

@Composable
fun AnalyzeScreen(
    state: AnalyzeUiState,
    callbacks: AnalyzeCallbacks,
    modifier: Modifier = Modifier,
) {
    RezScreen(modifier) {
        LazyColumn(
            modifier = Modifier.statusBarsPadding(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = RezDimens.ScreenPadding,
                top = 10.dp,
                end = RezDimens.ScreenPadding,
                bottom = 88.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(RezDimens.SectionSpacing),
        ) {
            item { AnalyzeHeader(state) }
            item { PlanUsageCard(state) }
            item { UploadSection(state, callbacks) }
            item { JobDescriptionSection(state, callbacks) }
            if (state.noticeMessage != null) {
                item(key = "analyze-notice") { AnalyzeNotice(state.noticeMessage) }
            }
            item { AnalyzeActions(state, callbacks) }
            item { ScorePreview(state.latestScore) }
        }
    }
}

@Composable
private fun AnalyzeHeader(state: AnalyzeUiState) {
    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = "Ready to tailor your resume",
                color = RezColors.Ink,
                fontSize = 24.sp,
                lineHeight = 28.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = "Let's improve your resume today.",
                color = RezColors.Muted,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }

        RezCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "RESUME SCORE",
                color = RezColors.Ink,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
            )
            Row(
                modifier = Modifier.padding(top = 8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    text = state.latestScore?.toString() ?: "--",
                    color = RezColors.Ink,
                    fontSize = 42.sp,
                    lineHeight = 44.sp,
                    fontWeight = FontWeight.Black,
                )
                Text(
                    text = "/100",
                    modifier = Modifier.padding(bottom = 5.dp, start = 6.dp),
                    color = RezColors.Ink,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                text = if (state.latestScore == null) {
                    "Upload a resume to generate an ATS score."
                } else {
                    "Great. Your resume has a fresh analysis."
                },
                modifier = Modifier.padding(top = 5.dp, bottom = 12.dp),
                color = RezColors.Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
            RezProgressBar(progress = (state.latestScore ?: 0) / 100f)
        }
    }
}

@Composable
private fun PlanUsageCard(state: AnalyzeUiState) {
    RezCard(modifier = Modifier.fillMaxWidth(), contentPadding = 14.dp) {
        Row(verticalAlignment = Alignment.Top) {
            RezSectionTitle(
                title = state.planName,
                modifier = Modifier.weight(1f),
                subtitle = if (state.isPro) {
                    "Unlimited analyses, improvements, and saved variants."
                } else {
                    "3 analyses/day, 3 improvements/day, 2 saved variants."
                },
            )
            Spacer(Modifier.width(8.dp))
            RezStatusPill(
                text = if (state.isPro) "PRO" else "FREE",
                color = if (state.isPro) RezColors.Success else RezColors.Warning,
            )
        }
        if (!state.isPro) {
            Row(
                modifier = Modifier.padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                UsageChip("${state.remainingAnalyses}", "analyses left", Modifier.weight(1f))
                UsageChip("${state.remainingImprovements}", "rewrites left", Modifier.weight(1f))
                UsageChip(
                    "${state.savedVariantCount}/${state.savedVariantLimit}",
                    "saved",
                    Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun UsageChip(label: String, detail: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .height(48.dp)
            .background(RezColors.Background, RoundedCornerShape(6.dp))
            .border(1.5.dp, RezColors.Ink, RoundedCornerShape(6.dp)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = label,
            color = RezColors.Ink,
            fontSize = 17.sp,
            fontWeight = FontWeight.Black,
            maxLines = 1,
        )
        Text(
            text = detail,
            color = RezColors.Muted,
            fontSize = 9.sp,
            fontWeight = FontWeight.Black,
            maxLines = 1,
        )
    }
}

@Composable
private fun UploadSection(state: AnalyzeUiState, callbacks: AnalyzeCallbacks) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        StepTitle("Upload Resume")
        val hasUpload = state.upload != null
        RezDashedPanel(
            modifier = Modifier
                .fillMaxWidth()
                .height(174.dp)
                .clickable(
                    enabled = !state.isUploading,
                    role = Role.Button,
                    onClick = callbacks::onPickResume,
                ),
            fill = if (state.isUploadTargeted) {
                RezColors.Warning.copy(alpha = 0.24f)
            } else {
                RezColors.Surface
            },
            borderColor = if (state.isUploadTargeted) RezColors.Link else RezColors.Ink,
        ) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                RezIconTile(
                    icon = if (hasUpload) Icons.Default.CheckCircle else Icons.Default.UploadFile,
                    background = when {
                        state.isUploadTargeted -> RezColors.Warning
                        hasUpload -> RezColors.Success
                        else -> RezColors.BlueWash
                    },
                    modifier = Modifier.size(76.dp),
                )
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = when {
                            state.isUploadTargeted -> "Drop to attach your resume"
                            hasUpload -> "Resume attached"
                            else -> "Tap to upload your resume"
                        },
                        color = RezColors.Ink,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        text = when {
                            state.isUploadTargeted -> "Release the file here"
                            hasUpload -> "Tap or drop to replace the file"
                            else -> "PDF or DOCX - drag and drop supported"
                        },
                        color = RezColors.Muted,
                        fontSize = 14.sp,
                    )
                }
            }
        }

        if (state.upload != null) {
            UploadedFileRow(state.upload, callbacks::onRemoveResume)
        }
        if (state.isUploading) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    color = RezColors.Ink,
                    strokeWidth = 2.dp,
                )
                Text("Parsing resume...", color = RezColors.Muted, fontSize = 12.sp)
            }
        }
        state.upload?.warnings.orEmpty().forEach { warning ->
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Icon(
                    imageVector = Icons.Default.WarningAmber,
                    contentDescription = null,
                    tint = RezColors.Ink,
                    modifier = Modifier.size(16.dp),
                )
                Text(warning, color = RezColors.Muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun UploadedFileRow(upload: UploadedResumeUi, onRemove: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Surface, RoundedCornerShape(6.dp))
            .border(2.dp, RezColors.Ink, RoundedCornerShape(6.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(width = 42.dp, height = 52.dp)
                .background(RezColors.Ink, RoundedCornerShape(6.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = upload.filename.substringAfterLast('.', "DOC").uppercase(),
                modifier = Modifier.padding(horizontal = 3.dp),
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = upload.filename,
                color = RezColors.Ink,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "${upload.characterCount} characters extracted",
                color = RezColors.Muted,
                fontSize = 14.sp,
            )
        }
        Box(
            modifier = Modifier
                .size(34.dp)
                .background(RezColors.Background, CircleShape)
                .clickable(role = Role.Button, onClick = onRemove),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Remove resume",
                tint = RezColors.Muted,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

@Composable
private fun JobDescriptionSection(state: AnalyzeUiState, callbacks: AnalyzeCallbacks) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        StepTitle("Job Description")
        RezPanel(
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp),
            cornerRadius = 6.dp,
        ) {
            Box(modifier = Modifier.padding(14.dp)) {
                BasicTextField(
                    value = state.jobDescription,
                    onValueChange = callbacks::onJobDescriptionChange,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 24.dp),
                    textStyle = androidx.compose.ui.text.TextStyle(
                        color = RezColors.Ink,
                        fontSize = 16.sp,
                        lineHeight = 21.sp,
                    ),
                    cursorBrush = SolidColor(RezColors.Ink),
                    decorationBox = { innerTextField ->
                        if (state.jobDescription.isEmpty()) {
                            Text(
                                text = "Paste the job description here...",
                                color = RezColors.Muted.copy(alpha = 0.72f),
                                fontSize = 16.sp,
                            )
                        }
                        innerTextField()
                    },
                )
                Text(
                    text = "${state.jobDescription.length}/${state.jobDescriptionLimit}",
                    modifier = Modifier.align(Alignment.BottomEnd),
                    color = if (state.jobDescription.length > state.jobDescriptionLimit) {
                        RezColors.Error
                    } else {
                        RezColors.Muted
                    },
                    fontSize = 12.sp,
                )
            }
        }
        RezButton(
            text = "Paste from Clipboard",
            onClick = callbacks::onPasteFromClipboard,
            modifier = Modifier.fillMaxWidth(),
            kind = RezButtonKind.Secondary,
        )
    }
}

@Composable
private fun AnalyzeActions(state: AnalyzeUiState, callbacks: AnalyzeCallbacks) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        RezButton(
            text = if (state.isAnalyzing) "Analyzing..." else "Analyze Resume",
            onClick = callbacks::onAnalyze,
            modifier = Modifier.fillMaxWidth(),
            enabled = state.upload != null &&
                state.jobDescription.isNotBlank() &&
                !state.isAnalyzing &&
                state.canAnalyze,
            leadingIcon = Icons.Default.AutoAwesome,
        )
        if (!state.canAnalyze) {
            Text(
                text = "Free analyses are used for today.",
                color = RezColors.Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
            RezButton(
                text = "Unlock unlimited analyses",
                onClick = callbacks::onUnlockPro,
                modifier = Modifier.fillMaxWidth(),
                kind = RezButtonKind.Secondary,
                fill = RezColors.Warning,
                enabled = !state.isPurchasing,
                leadingIcon = Icons.Default.LockOpen,
            )
            if (state.purchaseMessage != null) {
                Text(
                    text = state.purchaseMessage,
                    color = RezColors.Muted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun ScorePreview(score: Int?) {
    RezCard(modifier = Modifier.fillMaxWidth(), contentPadding = 18.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Text(
                    text = "Your ATS Score",
                    color = RezColors.Ink,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(
                        text = score?.toString() ?: "--",
                        color = if (score == null) RezColors.Ink else rezScoreColor(score),
                        fontSize = 38.sp,
                        lineHeight = 40.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text("/100", color = RezColors.Muted, fontSize = 14.sp)
                }
                Text(
                    text = if (score == null) {
                        "Upload your resume and job description to see your ATS score."
                    } else {
                        "Open the latest report for the full score breakdown."
                    },
                    color = RezColors.Muted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                )
            }
            Spacer(Modifier.width(18.dp))
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(RezColors.Background, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.BarChart,
                    contentDescription = null,
                    tint = RezColors.Ink,
                    modifier = Modifier.size(28.dp),
                )
            }
        }
    }
}

@Composable
private fun AnalyzeNotice(message: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Surface, RoundedCornerShape(8.dp))
            .border(2.dp, RezColors.Ink, RoundedCornerShape(8.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        RezIconTile(
            icon = Icons.Default.WarningAmber,
            background = RezColors.Warning,
            modifier = Modifier.size(34.dp),
        )
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = "Heads up",
                color = RezColors.Ink,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = message,
                color = RezColors.Muted,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun StepTitle(title: String) {
    Text(
        text = title,
        color = RezColors.Ink,
        fontSize = 20.sp,
        fontWeight = FontWeight.Black,
    )
}
