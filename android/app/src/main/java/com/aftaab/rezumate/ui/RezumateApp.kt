package com.aftaab.rezumate.ui

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import com.google.android.play.core.review.ReviewManagerFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.aftaab.rezumate.ui.designsystem.RezBottomBar
import com.aftaab.rezumate.ui.designsystem.RezMainTab
import com.aftaab.rezumate.ui.screens.AnalyzeCallbacks
import com.aftaab.rezumate.ui.screens.AnalyzeScreen
import com.aftaab.rezumate.ui.screens.HistoryCallbacks
import com.aftaab.rezumate.ui.screens.HistoryScreen
import com.aftaab.rezumate.ui.screens.PdfPreviewScreen
import com.aftaab.rezumate.ui.screens.ProfileCallbacks
import com.aftaab.rezumate.ui.screens.ProfileScreen
import com.aftaab.rezumate.ui.screens.ResultsCallbacks
import com.aftaab.rezumate.ui.screens.ResultsScreen
import com.aftaab.rezumate.ui.screens.VariantDetailCallbacks
import com.aftaab.rezumate.ui.screens.VariantDetailScreen
import com.aftaab.rezumate.ui.theme.RezColors
import com.aftaab.rezumate.ui.theme.RezumateTheme

@Composable
fun RezumateApp(
    initialDocumentUri: Uri?,
    appViewModel: AppViewModel = viewModel(),
) {
    val state by appViewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: Routes.ANALYZE
    var consumedInitialUri by rememberSaveable { mutableStateOf<String?>(null) }

    val documentPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION,
                )
            }
            appViewModel.importResume(uri)
        }
    }

    LaunchedEffect(initialDocumentUri?.toString()) {
        val uri = initialDocumentUri ?: return@LaunchedEffect
        if (consumedInitialUri != uri.toString()) {
            consumedInitialUri = uri.toString()
            appViewModel.importResume(uri, isExternal = true)
        }
    }

    LaunchedEffect(state.shouldRequestReview) {
        if (!state.shouldRequestReview) return@LaunchedEffect
        val activity = context.findActivity() ?: return@LaunchedEffect
        val manager = ReviewManagerFactory.create(context)
        manager.requestReviewFlow().addOnCompleteListener { task ->
            if (task.isSuccessful) {
                manager.launchReviewFlow(activity, task.result)
            }
            appViewModel.reviewPromptShown()
        }
    }

    LaunchedEffect(state.navigationRequest?.id) {
        val request = state.navigationRequest ?: return@LaunchedEffect
        when (request.destination) {
            AppDestination.ANALYZE -> navController.navigateMainTab(Routes.ANALYZE)
            AppDestination.RESULTS -> navController.navigate(Routes.RESULTS) {
                launchSingleTop = true
            }
            AppDestination.VARIANT -> navController.navigate(Routes.VARIANT) {
                launchSingleTop = true
            }
            AppDestination.PDF -> navController.navigate(Routes.PDF) {
                launchSingleTop = true
            }
        }
        appViewModel.navigationHandled(request.id)
    }

    val launchPurchase: () -> Unit = remember(context, appViewModel) {
        {
            context.findActivity()?.let(appViewModel::purchasePro)
            Unit
        }
    }

    RezumateTheme {
        Scaffold(
            containerColor = RezColors.Background,
            bottomBar = {
                val selectedTab = currentRoute.toMainTab()
                if (selectedTab != null) {
                    RezBottomBar(
                        selectedTab = selectedTab,
                        onTabSelected = { tab -> navController.navigateMainTab(tab.route()) },
                    )
                }
            },
        ) { contentPadding ->
            NavHost(
                navController = navController,
                startDestination = Routes.ANALYZE,
                // Only the top inset is consumed: content runs under the floating tab bar,
                // which reserves its own clearance via rezBottomBarClearance().
                modifier = Modifier.padding(top = contentPadding.calculateTopPadding()),
            ) {
                composable(Routes.ANALYZE) {
                    AnalyzeScreen(
                        state = state.toAnalyzeUiState(),
                        callbacks = object : AnalyzeCallbacks {
                            override fun onPickResume() {
                                documentPicker.launch(SUPPORTED_DOCUMENT_TYPES)
                            }
                            override fun onRemoveResume() = appViewModel.removeResume()
                            override fun onJobDescriptionChange(value: String) =
                                appViewModel.updateJobDescription(value)
                            override fun onPasteFromClipboard() {
                                val clipboard = context.getSystemService(ClipboardManager::class.java)
                                val pasted = clipboard?.primaryClip
                                    ?.takeIf { it.itemCount > 0 }
                                    ?.getItemAt(0)
                                    ?.coerceToText(context)
                                    ?.toString()
                                appViewModel.pasteJobDescription(pasted)
                            }
                            override fun onAnalyze() = appViewModel.analyze()
                            override fun onUnlockPro() = launchPurchase()
                        },
                    )
                }
                composable(Routes.HISTORY) {
                    LaunchedEffect(Unit) { appViewModel.loadHistory() }
                    HistoryScreen(
                        state = state.toHistoryUiState(),
                        callbacks = object : HistoryCallbacks {
                            override fun onRefresh() = appViewModel.loadHistory()
                            override fun onVariantClick(id: String) = appViewModel.loadVariant(id)
                            override fun onDeleteVariant(id: String) = appViewModel.deleteVariant(id)
                        },
                    )
                }
                composable(Routes.PROFILE) {
                    ProfileScreen(
                        state = state.toProfileUiState(),
                        callbacks = object : ProfileCallbacks {
                            override fun onUnlockPro() = launchPurchase()
                            override fun onRestorePurchase() = appViewModel.restorePurchase()
                            override fun onClearCurrentAnalysis() = appViewModel.clearCurrentAnalysis()
                        },
                    )
                }
                composable(Routes.RESULTS) {
                    val resultsState = state.toResultsUiState()
                    if (resultsState != null) {
                        ResultsScreen(
                            state = resultsState,
                            callbacks = object : ResultsCallbacks {
                                override fun onRefresh() = appViewModel.reanalyze()
                                override fun onUndoPlacement() = appViewModel.undoLastPlacement()
                                override fun onComponentScoreClick(id: String) =
                                    appViewModel.toggleComponentScore(id)
                                override fun onUnlockPro() = launchPurchase()
                                override fun onImproveResume() = appViewModel.improveResume()
                                override fun onExport() = appViewModel.exportCurrent()
                                override fun onKeywordClick(keyword: String) =
                                    appViewModel.startKeywordPlacement(keyword)
                                override fun onConfirmPlacement(bullet: String?) =
                                    appViewModel.confirmKeywordPlacement(bullet)
                                override fun onCancelPlacement() = appViewModel.cancelKeywordPlacement()
                                override fun onConfirmExportAnyway() = appViewModel.confirmExportAnyway()
                                override fun onCancelExportWarning() = appViewModel.cancelExportWarning()
                            },
                        )
                    } else {
                        LaunchedEffect(Unit) { navController.popBackStack() }
                    }
                }
                composable(Routes.VARIANT) {
                    val variantState = state.toVariantDetailUiState()
                    if (variantState != null) {
                        VariantDetailScreen(
                            state = variantState,
                            callbacks = object : VariantDetailCallbacks {
                                override fun onExport() = appViewModel.exportSelectedVariant()
                                override fun onConfirmExportAnyway() = appViewModel.confirmExportAnyway()
                                override fun onCancelExportWarning() = appViewModel.cancelExportWarning()
                            },
                        )
                    } else {
                        LaunchedEffect(Unit) { navController.popBackStack() }
                    }
                }
                composable(Routes.PDF) {
                    val pdf = state.exportedPdf
                    if (pdf != null) {
                        PdfPreviewScreen(
                            pdfFile = pdf,
                            onDone = {
                                appViewModel.onPdfPreviewClosed()
                                navController.popBackStack()
                            },
                            onShare = appViewModel::sharePdf,
                        )
                    } else {
                        LaunchedEffect(Unit) { navController.popBackStack() }
                    }
                }
            }
        }
    }
}

private object Routes {
    const val ANALYZE = "analyze"
    const val HISTORY = "history"
    const val PROFILE = "profile"
    const val RESULTS = "results"
    const val VARIANT = "variant"
    const val PDF = "pdf"
}

private val SUPPORTED_DOCUMENT_TYPES = arrayOf(
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
)

private fun RezMainTab.route(): String = when (this) {
    RezMainTab.Analyze -> Routes.ANALYZE
    RezMainTab.History -> Routes.HISTORY
    RezMainTab.Profile -> Routes.PROFILE
}

private fun String.toMainTab(): RezMainTab? = when (this) {
    Routes.ANALYZE -> RezMainTab.Analyze
    Routes.HISTORY -> RezMainTab.History
    Routes.PROFILE -> RezMainTab.Profile
    else -> null
}

private fun androidx.navigation.NavHostController.navigateMainTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
