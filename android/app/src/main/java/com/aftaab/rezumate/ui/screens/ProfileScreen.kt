package com.aftaab.rezumate.ui.screens

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.ui.designsystem.RezButton
import com.aftaab.rezumate.ui.designsystem.RezButtonKind
import com.aftaab.rezumate.ui.designsystem.RezCard
import com.aftaab.rezumate.ui.designsystem.RezDimens
import com.aftaab.rezumate.ui.designsystem.RezIconTile
import com.aftaab.rezumate.ui.designsystem.RezScreen
import com.aftaab.rezumate.ui.designsystem.RezSectionTitle
import com.aftaab.rezumate.ui.designsystem.RezStatusPill
import com.aftaab.rezumate.ui.designsystem.RezTitleBar
import com.aftaab.rezumate.ui.theme.RezColors

data class ProfileUiState(
    val isPro: Boolean = false,
    val entitlementLoaded: Boolean = false,
    val proPriceText: String? = null,
    val isPurchasing: Boolean = false,
    val isRestoring: Boolean = false,
    val purchaseMessage: String? = null,
    val appVersion: String = "1.0.0",
    val appBuild: String = "1",
)

interface ProfileCallbacks {
    fun onUnlockPro()
    fun onRestorePurchase()
    fun onClearCurrentAnalysis()
}

@Composable
fun ProfileScreen(
    state: ProfileUiState,
    callbacks: ProfileCallbacks,
    modifier: Modifier = Modifier,
) {
    RezScreen(modifier) {
        Column {
            RezTitleBar(title = "Profile")
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    start = RezDimens.ScreenPadding,
                    top = RezDimens.ScreenPadding,
                    end = RezDimens.ScreenPadding,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                item { WorkspaceCard() }
                item { PrivacyCard() }
                item { ProCard(state, callbacks) }
                item { HelpCard(state) }
                item { LocalDataCard(callbacks::onClearCurrentAnalysis) }
            }
        }
    }
}

@Composable
private fun WorkspaceCard() {
    RezCard(modifier = Modifier.fillMaxWidth(), contentPadding = 18.dp) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RezIconTile(
                icon = Icons.Default.Person,
                background = RezColors.BlueWash,
                modifier = Modifier.size(54.dp),
            )
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Local workspace",
                    color = RezColors.Ink,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                )
                RezStatusPill(text = "PRIVATE ON-DEVICE", color = RezColors.Warning)
            }
            Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
private fun PrivacyCard() {
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle("Privacy")
        Text(
            text = "Resume parsing, scoring, suggestions, history, and export run locally on this device.",
            modifier = Modifier.padding(top = 12.dp),
            color = RezColors.Muted,
            fontSize = 12.sp,
            lineHeight = 16.sp,
        )
    }
}

@Composable
private fun ProCard(state: ProfileUiState, callbacks: ProfileCallbacks) {
    RezCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.Top) {
            RezSectionTitle(
                title = "Rezumate Pro",
                modifier = Modifier.weight(1f),
                subtitle = "Pay once. Optimize unlimited resumes privately on your Android device.",
            )
            Spacer(Modifier.size(8.dp))
            RezStatusPill(
                text = when {
                    !state.entitlementLoaded -> "CHECKING"
                    state.isPro -> "ACTIVE"
                    else -> "ONE-TIME"
                },
                color = if (state.isPro) RezColors.Success else RezColors.Warning,
            )
        }
        Column(
            modifier = Modifier.padding(top = 14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PlanFeatureRow("Unlimited analyses")
            PlanFeatureRow("Unlimited resume improvements")
            PlanFeatureRow("Unlimited saved variants")
            PlanFeatureRow("Full ATS diagnosis and keyword insights")
        }
        Text(
            text = when {
                !state.entitlementLoaded -> "Checking your Play purchase..."
                state.isPro -> "Lifetime Pro is active on this device."
                state.proPriceText != null -> "One-time purchase: ${state.proPriceText}."
                else -> "Price unavailable. Restore Purchase remains available."
            },
            modifier = Modifier.padding(top = 14.dp),
            color = RezColors.Muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
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
        if (!state.isPro) {
            RezButton(
                text = if (state.isPurchasing) "Unlocking..." else "Unlock Pro",
                onClick = callbacks::onUnlockPro,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp),
                enabled = !state.isPurchasing && !state.isRestoring && state.proPriceText != null,
                leadingIcon = Icons.Default.AutoAwesome,
            )
        }
        RezButton(
            text = if (state.isRestoring) "Restoring..." else "Restore Purchase",
            onClick = callbacks::onRestorePurchase,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 10.dp),
            kind = RezButtonKind.Secondary,
            enabled = !state.isPurchasing && !state.isRestoring,
            leadingIcon = Icons.Default.Refresh,
        )
    }
}

@Composable
private fun PlanFeatureRow(text: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = RezColors.Success,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = text,
            color = RezColors.Ink,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun HelpCard(state: ProfileUiState) {
    val context = LocalContext.current
    fun sendEmail(subject: String) {
        val body = "\n\nApp: Rezumate ${state.appVersion} (${state.appBuild})\nAndroid: ${Build.VERSION.RELEASE}"
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("mailto:aftaab@aftaab.dev")
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_TEXT, body)
        }
        runCatching { context.startActivity(intent) }
    }
    fun openUrl(url: String) {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle(
            title = "Help & Feedback",
            subtitle = "Contact us without attaching any resume or job-description data.",
        )
        Column(modifier = Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            ProfileLink("Email Feedback") { sendEmail("Rezumate Feedback") }
            ProfileLink("Report a Problem") { sendEmail("Rezumate Problem Report") }
            ProfileLink("Request a Feature") { sendEmail("Rezumate Feature Request") }
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = RezColors.Ink.copy(alpha = 0.2f))
            ProfileLink("Support") { openUrl("https://rezumate.app/support") }
            ProfileLink("Privacy Policy") { openUrl("https://rezumate.app/privacy") }
            ProfileLink("Terms") { openUrl("https://rezumate.app/terms") }
        }
    }
}

@Composable
private fun ProfileLink(title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            color = RezColors.Ink,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.OpenInNew,
            contentDescription = null,
            tint = RezColors.Muted,
            modifier = Modifier.size(14.dp),
        )
    }
}

@Composable
private fun LocalDataCard(onClear: () -> Unit) {
    RezCard(modifier = Modifier.fillMaxWidth()) {
        RezSectionTitle("Local Data")
        RezButton(
            text = "Clear Current Analysis",
            onClick = onClear,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            kind = RezButtonKind.Secondary,
            fill = RezColors.Error,
            leadingIcon = Icons.Default.Delete,
        )
    }
}
