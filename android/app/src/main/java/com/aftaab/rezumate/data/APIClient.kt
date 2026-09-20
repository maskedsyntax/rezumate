package com.aftaab.rezumate.data

import android.content.Context
import android.net.Uri
import com.aftaab.rezumate.data.document.ContentUriDocumentImporter
import com.aftaab.rezumate.data.document.ImportedResume
import com.aftaab.rezumate.data.local.LocalStorageManager
import com.aftaab.rezumate.domain.ATSAnalysisResult
import com.aftaab.rezumate.domain.ATSScoringService
import com.aftaab.rezumate.domain.AnalysisInputValidator
import com.aftaab.rezumate.domain.JobFitExtractor
import com.aftaab.rezumate.domain.LocalAIService
import com.aftaab.rezumate.domain.ResumeTailoringService
import com.aftaab.rezumate.domain.ResumeParser
import com.aftaab.rezumate.model.AnalyzeResponse
import com.aftaab.rezumate.model.ImproveResumeResponse
import com.aftaab.rezumate.model.TailoredContent
import com.aftaab.rezumate.model.TailoringResponse
import com.aftaab.rezumate.model.UploadResponse
import com.aftaab.rezumate.model.VariantDetail
import com.aftaab.rezumate.model.VariantSummary
import java.time.Clock
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale
import java.util.UUID

fun interface ResumeDocumentImporter {
    suspend fun import(uri: Uri): ImportedResume
}

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
    private val importer: ResumeDocumentImporter,
    private val storage: LocalStorageManager,
    private val analyzer: ResumeAnalyzer = DefaultResumeAnalyzer,
    private val suggestionEngine: ResumeSuggestionEngine = DefaultResumeSuggestionEngine,
    private val variantAdapter: ATSAnalysisRecordAdapter = ATSAnalysisRecordAdapter(),
    private val clock: Clock = Clock.systemDefaultZone(),
) {
    constructor(context: Context) : this(
        importer = object : ResumeDocumentImporter {
            private val inner = ContentUriDocumentImporter(context.contentResolver)
            override suspend fun import(uri: Uri) = inner.import(uri)
        },
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
        val validatedResume = AnalysisInputValidator.validatedResumeText(resumeText)
        val validatedJobDescription = AnalysisInputValidator.validatedJobDescription(jobDescription)
        val result = analyzer.analyze(validatedResume, validatedJobDescription)
        val fit = JobFitExtractor.extract(validatedJobDescription, validatedResume)
        val now = Instant.now(clock).toString()
        val variant = AnalyzedVariant(
            id = UUID.randomUUID().toString(),
            resumeId = resumeId,
            variantName = variantName(fit.jobTitle),
            tailoredContent = validatedResume,
            atsScore = result.score,
            analysisFeedback = result,
            createdAt = now,
            updatedAt = now,
            jobDescription = validatedJobDescription,
        )
        if (shouldSave) {
            storage.saveVariant(
                variantAdapter.toRecord(variant),
                allowBeyondFreeLimit = allowBeyondFreeLimit,
            )
        } else {
            storage.saveTransientVariant(variantAdapter.toRecord(variant))
        }
        return variant.toAnalyzeResponse()
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
        return variant.toAnalyzeResponse()
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
        val updated = rescore(variant, updatedText)
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
            emptyList(),
        )
        val updated = rescore(variant, optimizedText)
        storage.updateVariant(variantAdapter.toRecord(updated))

        return ImproveResumeResponse(
            success = true,
            variantId = variant.id,
            optimizedResumeText = optimizedText,
            updatedAnalysis = updated.toAnalyzeResponse(),
            originalScore = variant.atsScore,
            componentDeltas = componentDeltas(feedback.componentScores, updated.analysisFeedback.componentScores),
            changedBullets = weakPoints.filterNot(optimizedText::contains),
            remainingBulletsWithoutMeasurableImpact =
                updated.analysisFeedback.bulletsWithoutMeasurableImpactCount,
        )
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun placeKeyword(
        variantId: String,
        keyword: String,
        alsoInBullet: String?,
        token: String,
    ): TailoringResponse {
        val variant = loadAnalyzedVariant(variantId)
        val originalScore = variant.atsScore
        var updatedText = ResumeTailoringService.placeInSkills(keyword, variant.tailoredContent)
        if (!alsoInBullet.isNullOrBlank()) {
            updatedText = ResumeTailoringService.placeInBullet(keyword, alsoInBullet, updatedText)
        }
        val updated = rescore(variant, updatedText)
        storage.updateVariant(variantAdapter.toRecord(updated))
        return TailoringResponse(
            success = true,
            variantId = updated.id,
            updatedResumeText = updatedText,
            updatedAnalysis = updated.toAnalyzeResponse(),
            originalScore = originalScore,
            placedKeyword = keyword,
        )
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun replaceTailoredContent(
        variantId: String,
        resumeText: String,
        token: String,
    ): AnalyzeResponse {
        val variant = loadAnalyzedVariant(variantId)
        val updated = rescore(variant, resumeText)
        storage.updateVariant(variantAdapter.toRecord(updated))
        return updated.toAnalyzeResponse()
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun exportVariant(id: String, token: String): ExportPlan {
        val variant = loadAnalyzedVariant(id)
        val document = ResumeParser.parse(variant.tailoredContent)
        if (!document.hasContent) {
            throw APIClientException(
                "Rezumate could not safely format this resume. Review the imported text and try again.",
            )
        }
        val warnings = if (document.unmappedContent.isNotEmpty()) {
            val preview = document.unmappedContent.take(3).joinToString("; ")
            listOf("Some header content could not be mapped safely: $preview")
        } else {
            emptyList()
        }
        return ExportPlan(
            resumeText = variant.tailoredContent,
            exportId = variant.id,
            warnings = warnings,
        )
    }

    private suspend fun loadAnalyzedVariant(id: String): AnalyzedVariant {
        val record = storage.loadVariant(id) ?: throw APIClientException("Variant not found.")
        return runCatching { variantAdapter.fromRecord(record) }
            .getOrElse { throw APIClientException("Stored analysis could not be read.", it) }
    }

    private fun rescore(variant: AnalyzedVariant, resumeText: String): AnalyzedVariant {
        val result = analyzer.analyze(resumeText, variant.scoringJobDescription)
        return variant.copy(
            tailoredContent = resumeText,
            atsScore = result.score,
            analysisFeedback = result,
            updatedAt = Instant.now(clock).toString(),
        )
    }

    private fun AnalyzedVariant.toAnalyzeResponse(): AnalyzeResponse {
        val fit = JobFitExtractor.extract(scoringJobDescription, tailoredContent)
        val result = analysisFeedback
        return AnalyzeResponse(
            success = true,
            variantId = id,
            score = atsScore,
            matchedKeywords = result.matchedKeywords,
            missingKeywords = result.missingKeywords,
            partialMatches = result.partialMatches,
            weakBullets = result.weakBullets,
            bulletsWithoutMeasurableImpact = result.bulletsWithoutMeasurableImpact,
            bulletsWithoutMeasurableImpactCount = result.bulletsWithoutMeasurableImpactCount,
            formattingWarnings = result.formattingWarnings,
            componentScores = result.componentScores,
            analysisStatus = "complete",
            aiModelName = LOCAL_MODEL_NAME,
            bulletCount = result.bulletCount,
            keywordCoverage = result.keywordCoverage,
            sections = result.sections,
            jobTitle = fit.jobTitle,
            jobTitleMatched = fit.jobTitleMatched,
            educationRequirement = fit.educationRequirement,
            educationMatched = fit.educationMatched,
        )
    }

    private fun variantName(jobTitle: String?): String {
        val title = jobTitle?.trim().orEmpty()
        if (title.isNotEmpty()) return title.take(48)
        return "Analysis ${formattedNow()}"
    }

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

data class ExportPlan(
    val resumeText: String,
    val exportId: String,
    val warnings: List<String>,
)

class APIClientException(message: String, cause: Throwable? = null) : Exception(message, cause)
