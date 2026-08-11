package com.aftaab.rezumate.data

import com.aftaab.rezumate.domain.ATSAnalysisResult
import org.junit.Assert.assertEquals
import org.junit.Test

class ATSAnalysisRecordAdapterTest {
    @Test
    fun `round trips current domain analysis through stable JSON record`() {
        val analysis = ATSAnalysisResult(
            scoreVersion = "ats-v1",
            score = 82,
            jdKeywords = listOf("kotlin"),
            matchedKeywords = listOf("kotlin"),
            missingKeywords = emptyList(),
            partialMatches = emptyList(),
            keywordCoverage = 100,
            bulletCount = 3,
            weakBulletCount = 0,
            bulletsWithoutMeasurableImpactCount = 1,
            weakBullets = emptyList(),
            bulletsWithoutMeasurableImpact = listOf("Built an app"),
            sections = mapOf("experience" to true),
            formattingWarnings = emptyList(),
            estimatedResumeLengthWords = 500,
            componentScores = mapOf("keywords" to 30),
        )
        val variant = AnalyzedVariant(
            id = "variant-id",
            resumeId = "resume-id",
            variantName = "Analysis",
            tailoredContent = "Resume text",
            atsScore = 82,
            analysisFeedback = analysis,
            createdAt = "2026-08-04T10:00:00Z",
            updatedAt = "2026-08-04T10:00:00Z",
        )
        val adapter = ATSAnalysisRecordAdapter()

        assertEquals(variant, adapter.fromRecord(adapter.toRecord(variant)))
    }
}
