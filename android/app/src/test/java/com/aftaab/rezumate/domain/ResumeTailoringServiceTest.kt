package com.aftaab.rezumate.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ResumeTailoringServiceTest {
    private val resumeWithSkills = """
        Alex Doe
        EXPERIENCE
        Acme
        Engineer
        • Built internal reporting workflows

        SKILLS
        Python, SQL
    """.trimIndent()

    private val resumeWithoutSkills = """
        Alex Doe
        EXPERIENCE
        Acme
        Engineer
        • Built internal reporting workflows
    """.trimIndent()

    @Test
    fun `places keyword in existing skills section`() {
        val updated = ResumeTailoringService.placeInSkills("kubernetes", resumeWithSkills)
        val document = ResumeParser.parse(updated)
        val analysis = ATSScoringService.analyzeResume(
            updated,
            "Seeking Python, Kubernetes, and Terraform experience for production infrastructure.",
        )

        assertTrue(document.skillCategories.any { it.items.lowercase().contains("kubernetes") })
        assertTrue(analysis.matchedKeywords.contains("kubernetes"))
        assertFalse(analysis.missingKeywords.contains("kubernetes"))
        assertTrue(analysis.missingKeywords.contains("terraform"))
        assertTrue(analysis.keywordCoverage > 0)
        assertFalse(updated.contains("%"))
    }

    @Test
    fun `creates skills section when missing`() {
        val updated = ResumeTailoringService.placeInSkills("terraform", resumeWithoutSkills)
        val document = ResumeParser.parse(updated)

        assertTrue(updated.contains("SKILLS"))
        assertTrue(
            document.skillCategories.any {
                it.items.lowercase().contains("terraform") || it.name.lowercase().contains("terraform")
            },
        )
        assertTrue(ATSScoringService.containsKeyword("terraform", updated))
    }

    @Test
    fun `places keyword in chosen bullet only`() {
        val withSkills = ResumeTailoringService.placeInSkills("kubernetes", resumeWithSkills)
        val updated = ResumeTailoringService.placeInBullet(
            "kubernetes",
            "Built internal reporting workflows",
            withSkills,
        )

        assertTrue(updated.contains("Built internal reporting workflows using Kubernetes"))
        assertFalse(updated.contains("12,000"))
        assertEquals(
            updated,
            ResumeTailoringService.placeInBullet(
                "kubernetes",
                "Built internal reporting workflows using Kubernetes",
                updated,
            ),
        )
    }

    @Test
    fun `refuses already matched keyword and missing bullet`() {
        val alreadyPresent = assertThrows(ResumeTailoringException::class.java) {
            ResumeTailoringService.placeInSkills("python", resumeWithSkills)
        }
        assertEquals(ResumeTailoringError.KeywordAlreadyPresent, alreadyPresent.error)

        val missingBullet = assertThrows(ResumeTailoringException::class.java) {
            ResumeTailoringService.placeInBullet(
                "kubernetes",
                "This bullet does not exist",
                resumeWithSkills,
            )
        }
        assertEquals(ResumeTailoringError.BulletNotFound, missingBullet.error)
    }
}
