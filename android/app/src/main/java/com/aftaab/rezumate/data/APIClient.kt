package com.aftaab.rezumate.data

import android.content.Context
import android.net.Uri
import com.aftaab.rezumate.data.document.ContentUriDocumentImporter
import com.aftaab.rezumate.data.local.LocalStorageManager
import com.aftaab.rezumate.domain.ATSAnalysisResult
import com.aftaab.rezumate.domain.ATSScoringService
import com.aftaab.rezumate.domain.LocalAIService
import com.aftaab.rezumate.model.AnalyzeResponse
import com.aftaab.rezumate.model.ImproveResumeResponse
import com.aftaab.rezumate.model.TailoredContent
import com.aftaab.rezumate.model.UploadResponse
import com.aftaab.rezumate.model.VariantDetail
import com.aftaab.rezumate.model.VariantSummary
import java.time.Clock
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale
import java.util.UUID

fun interface ResumeAnalyzer {
    fun analyze(resumeText: String, jobDescription: String): ATSAnalysisResult
}

interface ResumeSuggestionEngine {
    fun rewriteBullet(bullet: String, focusKeywords: List<String>): List<String>

    fun improveResume(
        resumeText: String,
        weakBullets: List<String>,
        focusKeywords: List<String>,
    ): String
}

object DefaultResumeAnalyzer : ResumeAnalyzer {
    override fun analyze(resumeText: String, jobDescription: String): ATSAnalysisResult =
        ATSScoringService.analyzeResume(resumeText, jobDescription)
}

object DefaultResumeSuggestionEngine : ResumeSuggestionEngine {
    override fun rewriteBullet(bullet: String, focusKeywords: List<String>): List<String> =
        LocalAIService.rewriteBullet(bullet, focusKeywords)

    override fun improveResume(
        resumeText: String,
        weakBullets: List<String>,
        focusKeywords: List<String>,
    ): String = LocalAIService.improveResume(resumeText, weakBullets, focusKeywords)
}

data class LocalAuthUser(
    val id: String,
    val email: String,
    val planTier: String,
)

data class LocalAuthResponse(
    val success: Boolean,
    val token: String,
    val user: LocalAuthUser,
)

data class RewriteBulletResponse(
    val success: Boolean,
    val originalBullet: String,
    val rewrittenBullets: List<String>,
    val aiModelName: String,
)

data class AcceptRewriteResponse(
    val success: Boolean,
    val variantId: String,
    val updatedResumeText: String,
)

class APIClient(
    private val importer: ContentUriDocumentImporter,
    private val storage: LocalStorageManager,
    private val analyzer: ResumeAnalyzer = DefaultResumeAnalyzer,
    private val suggestionEngine: ResumeSuggestionEngine = DefaultResumeSuggestionEngine,
    private val variantAdapter: ATSAnalysisRecordAdapter = ATSAnalysisRecordAdapter(),
    private val clock: Clock = Clock.systemDefaultZone(),
) {
    constructor(context: Context) : this(
        importer = ContentUriDocumentImporter(context.contentResolver),
        storage = LocalStorageManager(context.applicationContext),
    )

    @Suppress("UNUSED_PARAMETER")
    suspend fun authenticateWithGoogle(
        identityToken: String,
        email: String?,
        fullName: String?,
    ): LocalAuthResponse {
        val user = LocalAuthUser(
            id = UUID.randomUUID().toString(),
            email = email ?: "local.user@rezumate.local",
            planTier = "free",
        )
        return LocalAuthResponse(success = true, token = LOCAL_SESSION_TOKEN, user = user)
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun uploadResume(uri: Uri, token: String): UploadResponse {
        val imported = importer.import(uri)
        return UploadResponse(
            success = true,
            filename = imported.filename,
            resumeId = imported.resumeId,
            extractedText = imported.extractedText,
            warnings = imported.warnings,
            characterCount = imported.characterCount,
        )
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun analyzeResume(
        resumeId: String,
        resumeText: String,
        jobDescription: String,
        token: String,
        shouldSave: Boolean = true,
        allowBeyondFreeLimit: Boolean = false,
    ): AnalyzeResponse {
        val result = analyzer.analyze(resumeText, jobDescription)
        val now = Instant.now(clock).toString()
        val variant = AnalyzedVariant(
            id = UUID.randomUUID().toString(),
            resumeId = resumeId,
            variantName = "Analysis ${formattedNow()}",
            tailoredContent = resumeText,
            atsScore = result.score,
            analysisFeedback = result,
            createdAt = now,
            updatedAt = now,
        )
        if (shouldSave) {
            storage.saveVariant(
                variantAdapter.toRecord(variant),
                allowBeyondFreeLimit = allowBeyondFreeLimit,
            )
        } else {
            storage.saveTransientVariant(variantAdapter.toRecord(variant))
        }
        return result.toAnalyzeResponse(variant.id)
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun rewriteBullet(
        bullet: String,
        focusKeywords: List<String>,
        token: String,
    ): RewriteBulletResponse = RewriteBulletResponse(
        success = true,
        originalBullet = bullet,
        rewrittenBullets = suggestionEngine.rewriteBullet(bullet, focusKeywords),
        aiModelName = LOCAL_MODEL_NAME,
    )

    @Suppress("UNUSED_PARAMETER")
    suspend fun history(token: String): List<VariantSummary> = storage.loadHistory().map { record ->
        VariantSummary(
            id = record.id,
            resumeId = record.resumeId,
            variantName = record.variantName,
            atsScore = record.atsScore,
            createdAt = record.createdAt,
            updatedAt = record.updatedAt,
        )
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun deleteVariant(id: String, token: String) = storage.deleteVariant(id)

    suspend fun canSaveNewVariant(): Boolean = storage.canSaveNewVariant()

    suspend fun clearTransientVariants() = storage.clearTransientVariants()

    @Suppress("UNUSED_PARAMETER")
    suspend fun variant(id: String, token: String): VariantDetail {
        val record = storage.loadVariant(id) ?: throw APIClientException("Variant not found.")
        return VariantDetail(
            id = record.id,
            resumeId = record.resumeId,
            variantName = record.variantName,
            tailoredContent = TailoredContent(rawText = record.tailoredContent),
            atsScore = record.atsScore,
            createdAt = record.createdAt,
        )
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun analysisResult(id: String, token: String): AnalyzeResponse {
        val variant = loadAnalyzedVariant(id)
        return variant.analysisFeedback.toAnalyzeResponse(variant.id)
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun acceptRewrite(
        variantId: String,
        originalBullet: String,
        rewrittenBullet: String,
        token: String,
    ): AcceptRewriteResponse {
        val variant = loadAnalyzedVariant(variantId)
        if (!variant.tailoredContent.contains(originalBullet)) {
            throw APIClientException("Original bullet not found in resume.")
        }

        val updatedText = variant.tailoredContent.replace(originalBullet, rewrittenBullet)
        val updatedFeedback = analyzer.analyze(
            updatedText,
            variant.analysisFeedback.jdKeywords.joinToString(" "),
        )
        val updated = variant.copy(
            tailoredContent = updatedText,
            atsScore = updatedFeedback.score,
            analysisFeedback = updatedFeedback,
            updatedAt = Instant.now(clock).toString(),
        )
        storage.updateVariant(variantAdapter.toRecord(updated))
        return AcceptRewriteResponse(true, variantId, updatedText)
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun improveResume(variantId: String, token: String): ImproveResumeResponse {
        val variant = loadAnalyzedVariant(variantId)
        val feedback = variant.analysisFeedback
        val weakPoints = (feedback.weakBullets + feedback.bulletsWithoutMeasurableImpact).distinct()
        val optimizedText = suggestionEngine.improveResume(
            variant.tailoredContent,
            weakPoints,
            feedback.missingKeywords,
        )
        val updatedFeedback = analyzer.analyze(optimizedText, feedback.jdKeywords.joinToString(" "))
        val updated = variant.copy(
            tailoredContent = optimizedText,
            atsScore = updatedFeedback.score,
            analysisFeedback = updatedFeedback,
            updatedAt = Instant.now(clock).toString(),
        )
        storage.updateVariant(variantAdapter.toRecord(updated))

        return ImproveResumeResponse(
            success = true,
            variantId = variant.id,
            optimizedResumeText = optimizedText,
            updatedAnalysis = updatedFeedback.toAnalyzeResponse(variant.id),
            originalScore = variant.atsScore,
            componentDeltas = componentDeltas(feedback.componentScores, updatedFeedback.componentScores),
            changedBullets = weakPoints.filterNot(optimizedText::contains),
            remainingBulletsWithoutMeasurableImpact =
                updatedFeedback.bulletsWithoutMeasurableImpactCount,
        )
    }

    private suspend fun loadAnalyzedVariant(id: String): AnalyzedVariant {
        val record = storage.loadVariant(id) ?: throw APIClientException("Variant not found.")
        return runCatching { variantAdapter.fromRecord(record) }
            .getOrElse { throw APIClientException("Stored analysis could not be read.", it) }
    }

    private fun ATSAnalysisResult.toAnalyzeResponse(variantId: String) = AnalyzeResponse(
        success = true,
        variantId = variantId,
        score = score,
        matchedKeywords = matchedKeywords,
        missingKeywords = missingKeywords,
        weakBullets = weakBullets,
        bulletsWithoutMeasurableImpact = bulletsWithoutMeasurableImpact,
        bulletsWithoutMeasurableImpactCount = bulletsWithoutMeasurableImpactCount,
        formattingWarnings = formattingWarnings,
        componentScores = componentScores,
        analysisStatus = "complete",
        aiModelName = LOCAL_MODEL_NAME,
        bulletCount = bulletCount,
        keywordCoverage = keywordCoverage,
        sections = sections,
    )

    private fun componentDeltas(
        old: Map<String, Int>,
        new: Map<String, Int>,
    ): Map<String, Int> = (old.keys + new.keys).associateWith { key ->
        new.getOrDefault(key, 0) - old.getOrDefault(key, 0)
    }

    private fun formattedNow(): String = DateTimeFormatter
        .ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
        .withLocale(Locale.getDefault())
        .format(Instant.now(clock).atZone(clock.zone))

    private companion object {
        const val LOCAL_SESSION_TOKEN = "local-session-token"
        const val LOCAL_MODEL_NAME = "Local Suggestion Engine"
    }
}

class APIClientException(message: String, cause: Throwable? = null) : Exception(message, cause)
