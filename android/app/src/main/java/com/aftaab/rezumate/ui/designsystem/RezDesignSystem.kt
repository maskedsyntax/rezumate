package com.aftaab.rezumate.ui.designsystem

import androidx.compose.ui.draw.clip
import androidx.compose.animation.animateColorAsState
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.R
import com.aftaab.rezumate.ui.theme.RezColors

object RezDimens {
    val ScreenPadding = 16.dp
    val SectionSpacing = 24.dp
    val CardPadding = 16.dp
    val CardRadius = 8.dp
    val ControlRadius = 6.dp
    val Border = 2.dp
    val ThinBorder = 1.5.dp
    val HardShadow = 4.dp
    val ButtonHeight = 52.dp
}

enum class RezButtonKind {
    Primary,
    Secondary,
}

enum class RezMainTab(
    val label: String,
    @DrawableRes val illustration: Int,
) {
    Analyze("Analyze", R.drawable.tab_analyze),
    History("History", R.drawable.tab_history),
    Profile("Profile", R.drawable.tab_profile),
}

@Composable
fun RezScreen(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RezColors.Background),
        content = content,
    )
}

@Composable
fun RezCard(
    modifier: Modifier = Modifier,
    fill: Color = RezColors.Surface,
    contentPadding: Dp = RezDimens.CardPadding,
    content: @Composable ColumnScope.() -> Unit,
) {
    RezHardSurface(
        modifier = modifier,
        fill = fill,
        cornerRadius = RezDimens.CardRadius,
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content,
        )
    }
}

@Composable
fun RezPanel(
    modifier: Modifier = Modifier,
    fill: Color = RezColors.Surface,
    cornerRadius: Dp = RezDimens.CardRadius,
    shadowOffset: Dp = RezDimens.HardShadow,
    content: @Composable BoxScope.() -> Unit,
) {
    val shape = RoundedCornerShape(cornerRadius)
    Box(modifier = modifier.padding(end = shadowOffset, bottom = shadowOffset)) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .offset(shadowOffset, shadowOffset)
                .background(RezColors.Ink, shape),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(fill, shape)
                .border(RezDimens.Border, RezColors.Ink, shape),
            content = content,
        )
    }
}

@Composable
fun RezHardSurface(
    modifier: Modifier = Modifier,
    fill: Color = RezColors.Surface,
    cornerRadius: Dp = RezDimens.CardRadius,
    shadowOffset: Dp = RezDimens.HardShadow,
    borderWidth: Dp = RezDimens.Border,
    content: @Composable BoxScope.() -> Unit,
) {
    val shape = RoundedCornerShape(cornerRadius)
    Box(modifier = modifier.padding(end = shadowOffset, bottom = shadowOffset)) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .offset(shadowOffset, shadowOffset)
                .background(RezColors.Ink, shape),
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(fill, shape)
                .border(borderWidth, RezColors.Ink, shape),
            content = content,
        )
    }
}

@Composable
fun RezDashedPanel(
    modifier: Modifier = Modifier,
    fill: Color = RezColors.Surface,
    borderColor: Color = RezColors.Ink,
    content: @Composable BoxScope.() -> Unit,
) {
    val radius = RezDimens.CardRadius
    val strokeWidth = RezDimens.Border
    val dash = 6.dp
    Box(
        modifier = modifier
            .background(fill, RoundedCornerShape(radius))
            .drawBehind {
                val strokePx = strokeWidth.toPx()
                drawRoundRect(
                    color = borderColor,
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(radius.toPx()),
                    style = Stroke(
                        width = strokePx,
                        pathEffect = PathEffect.dashPathEffect(
                            floatArrayOf(dash.toPx(), dash.toPx()),
                        ),
                    ),
                )
            },
        content = content,
    )
}

@Composable
fun RezButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: RezButtonKind = RezButtonKind.Primary,
    fill: Color = if (kind == RezButtonKind.Primary) RezColors.Ink else RezColors.Surface,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val shape = RoundedCornerShape(RezDimens.ControlRadius)
    val foreground = if (kind == RezButtonKind.Primary && fill == RezColors.Ink) {
        Color.White
    } else {
        RezColors.Ink
    }
    val pressOffset = if (isPressed && enabled) 3.dp else 0.dp
    val shadowOffset = if (isPressed && enabled) 0.dp else RezDimens.HardShadow

    Box(
        modifier = modifier
            .height(RezDimens.ButtonHeight + RezDimens.HardShadow)
            .alpha(if (enabled) 1f else 0.46f)
            .padding(end = RezDimens.HardShadow, bottom = RezDimens.HardShadow),
    ) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .offset(shadowOffset, shadowOffset)
                .background(RezColors.Ink, shape),
        )
        Row(
            modifier = Modifier
                .fillMaxSize()
                .offset(pressOffset, pressOffset)
                .background(fill, shape)
                .border(RezDimens.Border, RezColors.Ink, shape)
                .clickable(
                    interactionSource = interactionSource,
                    indication = null,
                    enabled = enabled,
                    role = Role.Button,
                    onClick = onClick,
                )
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leadingIcon != null) {
                Icon(
                    imageVector = leadingIcon,
                    contentDescription = null,
                    modifier = Modifier.size(19.dp),
                    tint = foreground,
                )
                Spacer(Modifier.width(8.dp))
            }
            Text(
                text = text.uppercase(),
                color = foreground,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun RezSectionTitle(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(
            text = title,
            color = RezColors.Ink,
            fontSize = 17.sp,
            fontWeight = FontWeight.Black,
        )
        if (subtitle != null) {
            Text(
                text = subtitle,
                color = RezColors.Muted,
                fontSize = 14.sp,
                lineHeight = 19.sp,
            )
        }
    }
}

@Composable
fun RezStatusPill(
    text: String,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        modifier = modifier
            .background(color, RoundedCornerShape(4.dp))
            .border(RezDimens.Border, RezColors.Ink, RoundedCornerShape(4.dp))
            .padding(horizontal = 9.dp, vertical = 5.dp),
        color = RezColors.Ink,
        fontSize = 11.sp,
        fontWeight = FontWeight.Black,
        maxLines = 1,
    )
}

@Composable
fun RezIconTile(
    icon: ImageVector,
    background: Color,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    iconTint: Color = RezColors.Ink,
) {
    Box(
        modifier = modifier
            .background(background, RoundedCornerShape(6.dp))
            .border(RezDimens.Border, RezColors.Ink, RoundedCornerShape(6.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = iconTint,
            modifier = Modifier.fillMaxSize(0.52f),
        )
    }
}

@Composable
fun RezProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = RezColors.Ink,
    trackColor: Color = RezColors.Background,
    height: Dp = 10.dp,
) {
    Box(
        modifier = modifier
            .height(height)
            .background(trackColor)
            .border(1.dp, RezColors.Ink),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .height(height)
                .background(color),
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RezChipFlow(
    items: List<String>,
    color: Color,
    modifier: Modifier = Modifier,
    tappable: Boolean = false,
    onItemClick: (String) -> Unit = {},
) {
    FlowRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items.forEach { item ->
            Text(
                text = if (tappable) "+ $item" else item,
                modifier = Modifier
                    .defaultMinSize(minHeight = 34.dp)
                    .background(color, RoundedCornerShape(4.dp))
                    .border(RezDimens.Border, RezColors.Ink, RoundedCornerShape(4.dp))
                    .padding(horizontal = 10.dp, vertical = 7.dp)
                    .then(
                        if (tappable) {
                            Modifier.clickable(role = Role.Button) { onItemClick(item) }
                        } else {
                            Modifier
                        },
                    ),
                color = RezColors.Ink,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                lineHeight = 15.sp,
                textAlign = TextAlign.Center,
                maxLines = 2,
            )
        }
    }
}

@Composable
fun RezTitleBar(
    title: String,
    modifier: Modifier = Modifier,
    action: (@Composable RowScope.() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(RezColors.Background)
            .statusBarsPadding()
            .height(58.dp)
            .padding(horizontal = RezDimens.ScreenPadding),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            color = RezColors.Ink,
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            maxLines = 1,
        )
        if (action != null) {
            action()
        }
    }
}

/**
 * Floating pill-card tab bar: a white rounded card lifted off the content with a soft
 * shadow, tinting the active tab's glyph and label ink-black and the rest gray.
 */
@Composable
fun RezBottomBar(
    selectedTab: RezMainTab,
    onTabSelected: (RezMainTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    val navBottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    val card = RoundedCornerShape(BarRadius)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(
                start = BarSideInset,
                end = BarSideInset,
                bottom = navBottom + BarBottomGap,
            )
            .height(BarHeight)
            .shadow(
                elevation = 20.dp,
                shape = card,
                ambientColor = Color.Black.copy(alpha = 0.12f),
                spotColor = Color.Black.copy(alpha = 0.22f),
            )
            .background(Color.White, card)
            // Keeps the card's edge readable where it floats over white content.
            .border(1.dp, Color.Black.copy(alpha = 0.06f), card)
            .padding(horizontal = 4.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RezMainTab.entries.forEach { tab ->
            val selected = tab == selectedTab
            val tint by animateColorAsState(
                targetValue = if (selected) BarActive else BarInactive,
                label = "tabTint",
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        role = Role.Tab,
                        onClick = { onTabSelected(tab) },
                    ),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Image(
                    painter = painterResource(tab.illustration),
                    contentDescription = tab.label,
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(tint),
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = tab.label,
                    color = tint,
                    fontSize = 12.sp,
                    lineHeight = 14.sp,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 1,
                )
            }
        }
    }
}

private val BarHeight = 68.dp
private val BarRadius = 22.dp
private val BarSideInset = 16.dp
private val BarBottomGap = 12.dp
private val BarActive = Color(0xFF0D0D0D)
private val BarInactive = Color(0xFF939393)

/** Space a scrolling screen must leave at the bottom to clear the floating tab bar. */
@Composable
fun rezBottomBarClearance(): Dp =
    BarHeight + BarBottomGap +
        WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

fun rezScoreColor(score: Int?): Color = when (score ?: 0) {
    in 80..100 -> RezColors.Success
    in 60..79 -> RezColors.Warning
    else -> RezColors.Error
}
