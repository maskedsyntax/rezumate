package com.aftaab.rezumate.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.ui.designsystem.RezButton
import com.aftaab.rezumate.ui.designsystem.RezButtonKind
import com.aftaab.rezumate.ui.designsystem.RezCard
import com.aftaab.rezumate.ui.designsystem.RezDimens
import com.aftaab.rezumate.ui.designsystem.RezIconTile
import com.aftaab.rezumate.ui.designsystem.RezScreen
import com.aftaab.rezumate.ui.designsystem.rezBottomBarClearance
import com.aftaab.rezumate.ui.designsystem.RezTitleBar
import com.aftaab.rezumate.ui.designsystem.rezScoreColor
import com.aftaab.rezumate.ui.theme.RezColors

data class HistoryItemUi(
    val id: String,
    val variantName: String,
    val createdAtText: String,
    val atsScore: Int? = null,
)

data class HistoryUiState(
    val items: List<HistoryItemUi> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)

interface HistoryCallbacks {
    fun onRefresh()
    fun onVariantClick(id: String)
    fun onDeleteVariant(id: String)
}

@Composable
fun HistoryScreen(
    state: HistoryUiState,
    callbacks: HistoryCallbacks,
    modifier: Modifier = Modifier,
) {
    RezScreen(modifier) {
        Column {
            RezTitleBar(title = "History") {
                Text(
                    text = "Refresh",
                    modifier = Modifier
                        .clickable(role = Role.Button, onClick = callbacks::onRefresh)
                        .padding(8.dp),
                    color = RezColors.Ink,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Box(modifier = Modifier.weight(1f)) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(
                        start = RezDimens.ScreenPadding,
                        top = RezDimens.ScreenPadding,
                        end = RezDimens.ScreenPadding,
                        bottom = rezBottomBarClearance() + 16.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    when {
                        state.errorMessage != null -> item {
                            OfflineHistory(
                                message = state.errorMessage,
                                onRefresh = callbacks::onRefresh,
                            )
                        }
                        state.items.isEmpty() && !state.isLoading -> item { EmptyHistory() }
                        else -> items(
                            count = state.items.size,
                            key = { state.items[it].id },
                        ) { index ->
                            val item = state.items[index]
                            HistoryRow(
                                item = item,
                                onClick = { callbacks.onVariantClick(item.id) },
                                onLongClick = { callbacks.onDeleteVariant(item.id) },
                            )
                        }
                    }
                }
                if (state.isLoading && state.items.isEmpty()) {
                    LoadingHistory(modifier = Modifier.align(Alignment.Center))
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun HistoryRow(
    item: HistoryItemUi,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    RezCard(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                role = Role.Button,
                onClick = onClick,
                onLongClick = onLongClick,
                onLongClickLabel = "Delete",
            ),
        contentPadding = 14.dp,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(
                modifier = Modifier
                    .size(48.dp)
                    .background(rezScoreColor(item.atsScore), RoundedCornerShape(6.dp))
                    .border(2.dp, RezColors.Ink, RoundedCornerShape(6.dp)),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = (item.atsScore ?: 0).toString(),
                    color = RezColors.Ink,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                )
                Text(
                    text = "ATS",
                    color = RezColors.Ink,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                )
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = item.variantName,
                    color = RezColors.Ink,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(text = item.createdAtText, color = RezColors.Muted, fontSize = 14.sp)
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = RezColors.Muted,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

@Composable
private fun OfflineHistory(message: String, onRefresh: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Surface, RoundedCornerShape(8.dp))
            .border(2.dp, RezColors.Ink, RoundedCornerShape(8.dp))
            .padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        RezIconTile(
            icon = Icons.Default.AccessTime,
            background = RezColors.BlueWash,
            modifier = Modifier.size(72.dp),
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(7.dp),
        ) {
            Text(
                text = "History unavailable",
                color = RezColors.Ink,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = "Saved analyses will appear here when local history is available.",
                color = RezColors.Muted,
                fontSize = 14.sp,
                lineHeight = 19.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            )
            Text(
                text = message,
                color = RezColors.Muted.copy(alpha = 0.78f),
                fontSize = 12.sp,
                lineHeight = 16.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
        RezButton(
            text = "Refresh",
            onClick = onRefresh,
            modifier = Modifier.fillMaxWidth(),
            kind = RezButtonKind.Secondary,
            fill = RezColors.Warning,
        )
    }
}

@Composable
private fun EmptyHistory() {
    RezCard(modifier = Modifier.fillMaxWidth(), contentPadding = 28.dp) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            RezIconTile(
                icon = Icons.Default.Description,
                background = RezColors.BlueWash,
                modifier = Modifier.size(70.dp),
            )
            Text(
                text = "No analyses yet",
                color = RezColors.Ink,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Upload a resume and analyze it against a job description. Your results will appear here.",
                color = RezColors.Muted,
                fontSize = 14.sp,
                lineHeight = 19.sp,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun LoadingHistory(modifier: Modifier = Modifier) {
    RezCard(modifier = modifier, contentPadding = 18.dp) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                color = RezColors.Ink,
                strokeWidth = 2.dp,
            )
            Text(text = "Loading history...", color = RezColors.Ink, fontSize = 14.sp)
        }
    }
}
