package com.aftaab.rezumate.domain

import com.aftaab.rezumate.model.AnalyzeResponse
import com.aftaab.rezumate.model.UploadResponse
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class APIModelsSerializationTest {
    private val json = Json { explicitNulls = true }

    @Test
    fun `upload response uses Swift wire keys and String UUID`() {
        val value = UploadResponse(
            success = true,
            filename = "resume.pdf",
            resumeId = "3f10c390-68fd-4d76-a4db-77403a3bbef1",
            extractedText = "Resume",
            warnings = emptyList(),
            characterCount = 6,
        )

        val encoded = json.encodeToString(value)
        val decoded = json.decodeFromString<UploadResponse>(encoded)

        assertTrue(encoded.contains("\"resume_id\":\"3f10c390-68fd-4d76-a4db-77403a3bbef1\""))
        assertTrue(encoded.contains("\"extracted_text\":\"Resume\""))
        assertTrue(encoded.contains("\"character_count\":6"))
        assertEquals(value, decoded)
    }

    @Test
    fun `analysis response preserves nullable status and all active result fields`() {
        val value = AnalyzeResponse(
            success = true,
            variantId = "variant-id",
            score = 78,
            matchedKeywords = listOf("kotlin"),
            missingKeywords = listOf("docker"),
            weakBullets = emptyList(),
            bulletsWithoutMeasurableImpact = listOf("Built a service for teams"),
            bulletsWithoutMeasurableImpactCount = 1,
            formattingWarnings = emptyList(),
            componentScores = mapOf("keyword_coverage" to 50),
            analysisStatus = null,
            aiModelName = "Local Suggestion Engine",
            bulletCount = 1,
            keywordCoverage = 50,
            sections = mapOf("skills" to true),
        )

        val encoded = json.encodeToString(value)

        assertTrue(encoded.contains("\"variant_id\":\"variant-id\""))
        assertTrue(encoded.contains("\"analysis_status\":null"))
        assertTrue(encoded.contains("\"bullets_without_measurable_impact_count\":1"))
        assertEquals(value, json.decodeFromString<AnalyzeResponse>(encoded))
    }
}
