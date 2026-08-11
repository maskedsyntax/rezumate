package com.aftaab.rezumate.ui

import android.app.Activity
import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.viewModelScope
import com.aftaab.rezumate.billing.BillingState
import com.aftaab.rezumate.billing.PlayBillingClient
import com.aftaab.rezumate.data.APIClient
import com.aftaab.rezumate.data.local.UsageLimiter
import com.aftaab.rezumate.data.local.UsagePolicy
import com.aftaab.rezumate.data.local.UsageSnapshot
import com.aftaab.rezumate.export.ResumePdfExporter
import com.aftaab.rezumate.export.ResumePdfShare
import com.aftaab.rezumate.model.AnalyzeResponse
import com.aftaab.rezumate.model.UploadResponse
import com.aftaab.rezumate.model.VariantDetail
import com.aftaab.rezumate.model.VariantSummary
import com.aftaab.rezumate.ui.screens.AnalyzeUiState
import com.aftaab.rezumate.ui.screens.ComponentScoreUi
import com.aftaab.rezumate.ui.screens.HistoryItemUi
import com.aftaab.rezumate.ui.screens.HistoryUiState
import com.aftaab.rezumate.ui.screens.ProfileUiState
import com.aftaab.rezumate.ui.screens.ResultsUiState
import com.aftaab.rezumate.ui.screens.ResumeBulletIssueUi
import com.aftaab.rezumate.ui.screens.UploadedResumeUi
import com.aftaab.rezumate.ui.screens.VariantDetailUiState
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class AppDestination {
    ANALYZE,
    RESULTS,
    VARIANT,
    PDF,
}

data class NavigationRequest(
    val id: Long,
    val destination: AppDestination,
)

data class RezumateState(
    val upload: UploadResponse? = null,
    val jobDescription: String = "",
    val latestAnalysis: AnalyzeResponse? = null,
    val currentResult: AnalyzeResponse? = null,
    val selectedVariant: VariantDetail? = null,
    val history: List<VariantSummary> = emptyList(),
    val usage: UsageSnapshot = UsageSnapshot("", 0, 0),
    val billing: BillingState = BillingState(),
    val isUploading: Boolean = false,
    val isAnalyzing: Boolean = false,
    val isRefreshingAnalysis: Boolean = false,
    val isImproving: Boolean = false,
    val isHistoryLoading: Boolean = false,
    val analyzeNotice: String? = null,
    val resultsError: String? = null,
    val historyError: String? = null,
    val expandedComponentScores: Set<String> = emptySet(),
    val optimizedResumeText: String? = null,
    val originalScore: Int? = null,
    val originalComponentScores: Map<String, Int>? = null,
    val exportedPdf: File? = null,
    val navigationRequest: NavigationRequest? = null,
)

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val api = APIClient(application)
    private val usageLimiter = UsageLimiter(application)
    private val billingClient = PlayBillingClient(application)
    private val _state = MutableStateFlow(RezumateState())
    private var navigationId = 0L
    private var refinementJob: Job? = null
    private val foregroundObserver = object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            billingClient.retry()
        }
    }

    val state: StateFlow<RezumateState> = _state.asStateFlow()

    init {
        ProcessLifecycleOwner.get().lifecycle.addObserver(foregroundObserver)
        viewModelScope.launch {
            billingClient.state.collect { billing ->
                _state.update { it.copy(billing = billing) }
            }
        }
        viewModelScope.launch {
            val usage = runCatching { usageLimiter.loadSnapshot() }.getOrNull()
            val history = runCatching { api.history(TOKEN) }.getOrDefault(emptyList())
            _state.update {
                it.copy(
                    usage = usage ?: it.usage,
                    history = history,
                    historyError = null,
                )
            }
        }
    }

    fun importResume(uri: Uri, isExternal: Boolean = false) {
        if (_state.value.isUploading) return
        viewModelScope.launch {
            _state.update { it.copy(isUploading = true, analyzeNotice = null) }
            runCatching {
                withContext(Dispatchers.IO) { api.uploadResume(uri, TOKEN) }
            }.onSuccess { upload ->
                _state.update {
                    if (isExternal) {
                        it.copy(
                            upload = upload,
                            latestAnalysis = null,
                            currentResult = null,
                            selectedVariant = null,
                            optimizedResumeText = null,
                            originalScore = null,
                            originalComponentScores = null,
                            exportedPdf = null,
                            expandedComponentScores = emptySet(),
                            isUploading = false,
                        )
                    } else {
                        it.copy(upload = upload, isUploading = false)
                    }
                }
            }.onFailure { error ->
                _state.update {
                    it.copy(
                        isUploading = false,
                        analyzeNotice = if (isExternal) it.analyzeNotice else error.userMessage(),
                    )
                }
            }
        }
    }

    fun removeResume() {
        _state.update { it.copy(upload = null) }
    }

    fun updateJobDescription(value: String) {
        _state.update { it.copy(jobDescription = value) }
    }

    fun analyze() {
        val snapshot = _state.value
        val upload = snapshot.upload ?: return
        if (snapshot.isAnalyzing) return
        if (!snapshot.canAnalyze()) {
            _state.update {
                it.copy(analyzeNotice = "Free analyses are used for today. Unlock Pro once for unlimited analyses.")
            }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isAnalyzing = true, analyzeNotice = null) }
            val isPro = _state.value.billing.isPro
            val shouldSave = isPro || runCatching { api.canSaveNewVariant() }.getOrDefault(false)
            runCatching {
                withContext(Dispatchers.Default) {
                    api.analyzeResume(
                        resumeId = upload.resumeId,
                        resumeText = upload.extractedText,
                        jobDescription = snapshot.jobDescription,
                        token = TOKEN,
                        shouldSave = shouldSave,
                        allowBeyondFreeLimit = isPro,
                    )
                }
            }.onSuccess { result ->
                val usage = if (_state.value.billing.isPro) {
                    _state.value.usage
                } else {
                    usageLimiter.recordAnalysis()
                }
                _state.update {
                    it.copy(
                        latestAnalysis = result,
                        currentResult = result,
                        usage = usage,
                        isAnalyzing = false,
                        analyzeNotice = if (shouldSave) null else FREE_HISTORY_NOTICE,
                        resultsError = null,
                        optimizedResumeText = null,
                        originalScore = null,
                        originalComponentScores = null,
                        exportedPdf = null,
                        expandedComponentScores = emptySet(),
                    )
                }
                refreshHistorySilently()
                requestNavigation(AppDestination.RESULTS)
                pollForRefinedAnalysis(result.variantId)
            }.onFailure { error ->
                _state.update {
                    it.copy(isAnalyzing = false, analyzeNotice = error.userMessage())
                }
            }
        }
    }

    fun reanalyze() {
        val snapshot = _state.value
        val current = snapshot.currentResult ?: return
        val upload = snapshot.upload ?: return
        if (snapshot.isRefreshingAnalysis) return
        if (!snapshot.canAnalyze()) {
            _state.update {
                it.copy(resultsError = "Free analyses are used for today. Unlock Pro once for unlimited analyses.")
            }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isRefreshingAnalysis = true, resultsError = null) }
            val isPro = _state.value.billing.isPro
            val shouldSave = isPro || runCatching { api.canSaveNewVariant() }.getOrDefault(false)
            runCatching {
                withContext(Dispatchers.Default) {
                    val variant = api.variant(current.variantId, TOKEN)
                    api.analyzeResume(
                        resumeId = upload.resumeId,
                        resumeText = variant.tailoredContent.rawText.orEmpty(),
                        jobDescription = snapshot.jobDescription,
                        token = TOKEN,
                        shouldSave = shouldSave,
                        allowBeyondFreeLimit = isPro,
                    )
                }
            }.onSuccess { result ->
                val usage = if (_state.value.billing.isPro) {
                    _state.value.usage
                } else {
                    usageLimiter.recordAnalysis()
                }
                _state.update {
                    it.copy(
                        latestAnalysis = result,
                        currentResult = result,
                        usage = usage,
                        isRefreshingAnalysis = false,
                        resultsError = if (shouldSave) null else FREE_REFRESH_NOTICE,
                        expandedComponentScores = emptySet(),
                    )
                }
                refreshHistorySilently()
                pollForRefinedAnalysis(result.variantId)
            }.onFailure { error ->
                _state.update {
                    it.copy(isRefreshingAnalysis = false, resultsError = error.userMessage())
                }
            }
        }
    }

    fun improveResume() {
        val snapshot = _state.value
        val current = snapshot.currentResult ?: return
        if (snapshot.isImproving) return
        if (!snapshot.canImprove()) {
            _state.update {
                it.copy(resultsError = "Free improvements are used for today. Unlock Pro once for unlimited improvements.")
            }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isImproving = true, resultsError = null, exportedPdf = null) }
            runCatching {
                withContext(Dispatchers.Default) { api.improveResume(current.variantId, TOKEN) }
            }.onSuccess { response ->
                val isPro = _state.value.billing.isPro
                val usage = if (isPro) _state.value.usage else usageLimiter.recordImprovement()
                _state.update {
                    it.copy(
                        latestAnalysis = response.updatedAnalysis,
                        currentResult = response.updatedAnalysis,
                        usage = usage,
                        optimizedResumeText = response.optimizedResumeText,
                        originalScore = it.originalScore ?: response.originalScore,
                        originalComponentScores = it.originalComponentScores ?: current.componentScores,
                    )
                }
                runCatching {
                    withContext(Dispatchers.IO) {
                        ResumePdfExporter.export(
                            getApplication(),
                            response.optimizedResumeText,
                            response.variantId,
                        )
                    }
                }.onSuccess { pdf ->
                    _state.update { it.copy(exportedPdf = pdf, isImproving = false) }
                    refreshHistorySilently()
                    requestNavigation(AppDestination.PDF)
                }.onFailure { error ->
                    _state.update { it.copy(isImproving = false, resultsError = error.userMessage()) }
                }
            }.onFailure { error ->
                _state.update { it.copy(isImproving = false, resultsError = error.userMessage()) }
            }
        }
    }

    fun viewPdf() {
        if (_state.value.exportedPdf?.isFile == true) requestNavigation(AppDestination.PDF)
    }

    fun sharePdf() {
        val pdf = _state.value.exportedPdf ?: return
        runCatching { ResumePdfShare.share(getApplication(), pdf) }
            .onFailure { error ->
                _state.update { it.copy(resultsError = error.userMessage()) }
            }
    }

    fun toggleComponentScore(id: String) {
        if (!_state.value.billing.isPro) {
            _state.update { it.copy(resultsError = "Detailed diagnosis is included with Rezumate Pro.") }
            return
        }
        _state.update { current ->
            val expanded = current.expandedComponentScores.toMutableSet()
            if (!expanded.add(id)) expanded.remove(id)
            current.copy(expandedComponentScores = expanded)
        }
    }

    fun loadHistory() {
        if (_state.value.isHistoryLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isHistoryLoading = true, historyError = null) }
            runCatching { withContext(Dispatchers.IO) { api.history(TOKEN) } }
                .onSuccess { history ->
                    _state.update {
                        it.copy(history = history, isHistoryLoading = false, historyError = null)
                    }
                }.onFailure { error ->
                    _state.update {
                        it.copy(isHistoryLoading = false, historyError = error.userMessage())
                    }
                }
        }
    }

    fun loadVariant(id: String) {
        viewModelScope.launch {
            runCatching { withContext(Dispatchers.IO) { api.variant(id, TOKEN) } }
                .onSuccess { variant ->
                    _state.update { it.copy(selectedVariant = variant, historyError = null) }
                    requestNavigation(AppDestination.VARIANT)
                }.onFailure { error ->
                    _state.update { it.copy(historyError = error.userMessage()) }
                }
        }
    }

    fun deleteVariant(id: String) {
        viewModelScope.launch {
            runCatching { withContext(Dispatchers.IO) { api.deleteVariant(id, TOKEN) } }
                .onSuccess {
                    _state.update { current ->
                        current.copy(history = current.history.filterNot { it.id == id })
                    }
                }.onFailure { error ->
                    _state.update { it.copy(historyError = error.userMessage()) }
                }
        }
    }

    fun purchasePro(activity: Activity) {
        billingClient.launchPurchase(activity)
    }

    fun restorePurchase() {
        billingClient.restorePurchases()
    }

    fun clearCurrentAnalysis() {
        refinementJob?.cancel()
        _state.update {
            it.copy(
                upload = null,
                jobDescription = "",
                latestAnalysis = null,
                currentResult = null,
                selectedVariant = null,
                analyzeNotice = null,
                resultsError = null,
                expandedComponentScores = emptySet(),
                optimizedResumeText = null,
                originalScore = null,
                originalComponentScores = null,
                exportedPdf = null,
            )
        }
        viewModelScope.launch { api.clearTransientVariants() }
        requestNavigation(AppDestination.ANALYZE)
    }

    fun navigationHandled(id: Long) {
        _state.update { current ->
            if (current.navigationRequest?.id == id) current.copy(navigationRequest = null) else current
        }
    }

    override fun onCleared() {
        ProcessLifecycleOwner.get().lifecycle.removeObserver(foregroundObserver)
        billingClient.close()
        super.onCleared()
    }

    private fun requestNavigation(destination: AppDestination) {
        _state.update {
            it.copy(navigationRequest = NavigationRequest(++navigationId, destination))
        }
    }

    private fun refreshHistorySilently() {
        viewModelScope.launch {
            runCatching { withContext(Dispatchers.IO) { api.history(TOKEN) } }
                .onSuccess { history -> _state.update { it.copy(history = history) } }
        }
    }

    private fun pollForRefinedAnalysis(variantId: String) {
        if (_state.value.currentResult?.analysisStatus != "pending") return
        refinementJob?.cancel()
        refinementJob = viewModelScope.launch {
            _state.update { it.copy(isRefreshingAnalysis = true) }
            repeat(20) {
                delay(2_000)
                val refreshed = runCatching {
                    withContext(Dispatchers.Default) { api.analysisResult(variantId, TOKEN) }
                }.getOrElse { error ->
                    _state.update {
                        it.copy(isRefreshingAnalysis = false, resultsError = error.userMessage())
                    }
                    return@launch
                }
                if (_state.value.currentResult?.variantId != variantId) return@launch
                _state.update {
                    it.copy(latestAnalysis = refreshed, currentResult = refreshed)
                }
                if (refreshed.analysisStatus != "pending") {
                    _state.update { it.copy(isRefreshingAnalysis = false) }
                    return@launch
                }
            }
            _state.update { it.copy(isRefreshingAnalysis = false) }
        }
    }

    private companion object {
        const val TOKEN = "local-session-token"
        const val FREE_HISTORY_NOTICE =
            "History is full on Free. This result is usable now and exportable, but it was not saved."
        const val FREE_REFRESH_NOTICE =
            "History is full on Free. This refreshed result is usable now, but it was not saved."
    }
}

fun RezumateState.toAnalyzeUiState(): AnalyzeUiState = AnalyzeUiState(
    latestScore = latestAnalysis?.score,
    planName = if (billing.isPro) "Pro Lifetime" else "Free",
    isPro = billing.isPro,
    remainingAnalyses = if (billing.isPro) Int.MAX_VALUE else UsagePolicy.remainingAnalyses(usage),
    remainingImprovements = if (billing.isPro) Int.MAX_VALUE else UsagePolicy.remainingImprovements(usage),
    savedVariantCount = history.size,
    savedVariantLimit = UsagePolicy.FREE_SAVED_VARIANTS,
    upload = upload?.let {
        UploadedResumeUi(
            filename = it.filename,
            characterCount = it.characterCount,
            warnings = it.warnings,
        )
    },
    isUploading = isUploading,
    jobDescription = jobDescription,
    isAnalyzing = isAnalyzing,
    canAnalyze = canAnalyze(),
    isPurchasing = billing.isPurchasing,
    purchaseMessage = billing.message,
    noticeMessage = analyzeNotice,
)

fun RezumateState.toResultsUiState(): ResultsUiState? {
    val result = currentResult ?: return null
    return ResultsUiState(
        score = result.score,
        isPro = billing.isPro,
        isRefinementPending = result.analysisStatus == "pending",
        isRefreshing = isRefreshingAnalysis,
        isOptimized = optimizedResumeText != null,
        originalScore = originalScore,
        componentScores = result.componentScores.toSortedMap().map { (key, value) ->
            val details = scoreDetails(key, result)
            ComponentScoreUi(
                id = key,
                label = key.titleLabel(),
                value = value,
                delta = originalComponentScores?.let { value - it.getOrDefault(key, 0) },
                isExpanded = key in expandedComponentScores,
                importance = details.first,
                diagnosis = details.second,
            )
        },
        bulletIssues = mergeBulletIssues(result),
        formattingWarnings = result.formattingWarnings,
        missingSections = result.sections
            .filterValues { present -> !present }
            .keys
            .map(String::titleLabel)
            .sorted(),
        matchedKeywords = result.matchedKeywords,
        missingKeywords = result.missingKeywords,
        proPriceText = billing.price ?: "$7.99",
        isPurchasing = billing.isPurchasing,
        purchaseMessage = billing.message,
        remainingImprovements = if (billing.isPro) {
            Int.MAX_VALUE
        } else {
            UsagePolicy.remainingImprovements(usage)
        },
        canImprove = canImprove(),
        isImproving = isImproving,
        remainingImpactIssueCount = result.bulletsWithoutMeasurableImpactCount,
        canViewExport = exportedPdf?.isFile == true,
        errorMessage = resultsError,
    )
}

fun RezumateState.toHistoryUiState(): HistoryUiState = HistoryUiState(
    items = history.map { variant ->
        HistoryItemUi(
            id = variant.id,
            variantName = variant.variantName,
            createdAtText = formatHistoryDate(variant.createdAt),
            atsScore = variant.atsScore,
        )
    },
    isLoading = isHistoryLoading,
    errorMessage = historyError,
)

fun RezumateState.toProfileUiState(): ProfileUiState = ProfileUiState(
    isPro = billing.isPro,
    proPriceText = billing.price ?: "$7.99",
    isPurchasing = billing.isPurchasing,
    purchaseMessage = billing.message,
)

fun RezumateState.toVariantDetailUiState(): VariantDetailUiState? = selectedVariant?.let {
    VariantDetailUiState(
        variantName = it.variantName,
        atsScore = it.atsScore,
        resumeText = it.tailoredContent.rawText,
    )
}

private fun RezumateState.canAnalyze(): Boolean =
    billing.isPro || UsagePolicy.remainingAnalyses(usage) > 0

private fun RezumateState.canImprove(): Boolean =
    billing.isPro || UsagePolicy.remainingImprovements(usage) > 0

private fun mergeBulletIssues(result: AnalyzeResponse): List<ResumeBulletIssueUi> {
    val issues = linkedMapOf<String, MutableList<String>>()
    result.weakBullets.forEach { bullet ->
        issues.getOrPut(bullet, ::mutableListOf).addIfAbsent("WEAK WORDING")
    }
    result.bulletsWithoutMeasurableImpact.forEach { bullet ->
        issues.getOrPut(bullet, ::mutableListOf).addIfAbsent("IMPACT UNCLEAR")
    }
    return issues.map { (text, reasons) -> ResumeBulletIssueUi(text, reasons.toList()) }
}

private fun MutableList<String>.addIfAbsent(value: String) {
    if (value !in this) add(value)
}

private fun scoreDetails(key: String, result: AnalyzeResponse): Pair<String, String> = when (key) {
    "formatting_risk" -> {
        val importance = "Most hiring pipelines run resumes through digital parser APIs. If a file has complex layouts, multi-column tables, or unreadable characters, it won't load into recruiter databases correctly."
        val explanation = if (result.formattingWarnings.isEmpty()) {
            "Excellent! Your resume layout passed all formatting parser rules and is fully optimized for digital importing."
        } else {
            "Your resume has ${result.formattingWarnings.size} formatting risk(s) that might disrupt digital parsers: ${result.formattingWarnings.joinToString(", ")}."
        }
        importance to explanation
    }
    "impact_quality" -> {
        val importance = "Strong resume bullets connect work to outcomes. Numbers are best when they are real, but clear outcome, reliability, quality, performance, or delivery signals are also stronger than task-only bullets."
        val impactCount = result.bulletCount - result.bulletsWithoutMeasurableImpactCount
        importance to "$impactCount out of ${result.bulletCount} bullets contain impact signals. Improve Resume strengthens task-only bullets with clearer outcome language without adding fake numbers."
    }
    "keyword_coverage" -> {
        val importance = "ATS systems rank applications based on keyword density. If your resume lacks the specific skills, languages, and tools requested in the job description, you won't surface in recruiter searches."
        val total = result.matchedKeywords.size + result.missingKeywords.size
        importance to "Matched ${result.matchedKeywords.size} out of $total keywords requested by the employer (${result.keywordCoverage}% coverage). Incorporate the missing skills shown below to rank higher."
    }
    "structure_readability" -> {
        val importance = "Clear document sections ensure automatic parsers can index your experiences correctly, and help humans scan your career timeline. Missing sections like Education or Skills hurt readability."
        val missing = result.sections.filterValues { !it }.keys.map { it.titleLabel("_") }
        val explanation = if (missing.isEmpty()) {
            "Excellent. All standard resume sections (Summary, Experience, Projects, Skills, and Education) are clearly present and parseable."
        } else {
            "Missing or unparseable section(s): ${missing.joinToString(", ")}. Check your headers so automatic parsers map your work history correctly."
        }
        importance to explanation
    }
    else -> "" to ""
}

private fun String.titleLabel(separator: String = " "): String =
    split('_').joinToString(separator) { word ->
        word.lowercase(Locale.getDefault()).replaceFirstChar { character ->
            if (character.isLowerCase()) character.titlecase(Locale.getDefault()) else character.toString()
        }
    }

private fun formatHistoryDate(value: String): String = runCatching {
    DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
        .withLocale(Locale.getDefault())
        .format(Instant.parse(value).atZone(ZoneId.systemDefault()))
}.getOrDefault(value)

private fun Throwable.userMessage(): String = localizedMessage?.takeIf(String::isNotBlank)
    ?: "Something went wrong."
