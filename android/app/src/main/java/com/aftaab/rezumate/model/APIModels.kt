package com.aftaab.rezumate.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UploadResponse(
    val success: Boolean,
    val filename: String,
    @SerialName("resume_id") val resumeId: String,
    @SerialName("extracted_text") val extractedText: String,
    val warnings: List<String>,
    @SerialName("character_count") val characterCount: Int,
)

@Serializable
data class AnalyzeResponse(
    val success: Boolean,
    @SerialName("variant_id") val variantId: String,
    val score: Int,
    @SerialName("matched_keywords") val matchedKeywords: List<String>,
    @SerialName("missing_keywords") val missingKeywords: List<String>,
    @SerialName("weak_bullets") val weakBullets: List<String>,
    @SerialName("bullets_without_measurable_impact")
    val bulletsWithoutMeasurableImpact: List<String>,
    @SerialName("bullets_without_measurable_impact_count")
    val bulletsWithoutMeasurableImpactCount: Int,
    @SerialName("formatting_warnings") val formattingWarnings: List<String>,
    @SerialName("component_scores") val componentScores: Map<String, Int>,
    @SerialName("analysis_status") val analysisStatus: String?,
    @SerialName("ai_model_name") val aiModelName: String?,
    @SerialName("bullet_count") val bulletCount: Int,
    @SerialName("keyword_coverage") val keywordCoverage: Int,
    val sections: Map<String, Boolean>,
)

@Serializable
data class VariantSummary(
    val id: String,
    @SerialName("resume_id") val resumeId: String,
    @SerialName("variant_name") val variantName: String,
    @SerialName("ats_score") val atsScore: Int?,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

@Serializable
data class VariantDetail(
    val id: String,
    @SerialName("resume_id") val resumeId: String,
    @SerialName("variant_name") val variantName: String,
    @SerialName("tailored_content") val tailoredContent: TailoredContent,
    @SerialName("ats_score") val atsScore: Int?,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class TailoredContent(
    @SerialName("raw_text") val rawText: String?,
)

@Serializable
data class ImproveResumeResponse(
    val success: Boolean,
    val variantId: String,
    val optimizedResumeText: String,
    val updatedAnalysis: AnalyzeResponse,
    val originalScore: Int,
    val componentDeltas: Map<String, Int>,
    val changedBullets: List<String>,
    val remainingBulletsWithoutMeasurableImpact: Int,
)
