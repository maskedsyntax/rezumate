package com.aftaab.rezumate.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ATSScoringServiceTest {
    @Test
    fun `extractKeywords canonicalizes aliases and removes weaker API keyword`() {
        val keywords = ATSScoringService.extractKeywords(
            "Build REST APIs with NextJS, Node JS, Tailwind, React, API, and GraphQL.",
        )

        assertEquals(
            listOf("graphql", "next.js", "node.js", "react", "rest api", "tailwind css"),
            keywords,
        )
    }

    @Test
    fun `analyzeResume preserves Swift weights sections and short-resume warning`() {
        val resume = """
            SUMMARY
            Product engineer
            EXPERIENCE
            - Built React APIs improving performance by 30%
            SKILLS
            React, REST API
            EDUCATION
            Example University
        """.trimIndent()

        val result = ATSScoringService.analyzeResume(
            resumeText = resume,
            jobDescription = "React REST APIs Docker",
        )

        assertEquals("ats-v1", result.scoreVersion)
        assertEquals(79, result.score)
        assertEquals(listOf("react", "rest api"), result.matchedKeywords)
        assertEquals(listOf("docker"), result.missingKeywords)
        assertEquals(67, result.keywordCoverage)
        assertEquals(1, result.bulletCount)
        assertEquals(0, result.weakBulletCount)
        assertEquals(0, result.bulletsWithoutMeasurableImpactCount)
        assertEquals(
            mapOf(
                "summary" to true,
                "experience" to true,
                "projects" to false,
                "skills" to true,
                "education" to true,
            ),
            result.sections,
        )
        assertEquals(
            listOf("Resume appears unusually short after extraction."),
            result.formattingWarnings,
        )
        assertEquals(
            mapOf(
                "keyword_coverage" to 67,
                "impact_quality" to 100,
                "structure_readability" to 80,
                "formatting_risk" to 80,
            ),
            result.componentScores,
        )
    }

    @Test
    fun `partial keyword match receives half coverage`() {
        val result = ATSScoringService.analyzeResume(
            resumeText = "We use machine vision in production.",
            jobDescription = "Machine learning",
        )

        assertEquals(listOf("machine learning"), result.partialMatches)
        assertEquals(50, result.keywordCoverage)
        assertTrue(result.matchedKeywords.isEmpty())
        assertTrue(result.missingKeywords.isEmpty())
    }

    @Test
    fun `non-special multiword keywords require the same literal spacing as Swift`() {
        assertEquals(emptyList<String>(), ATSScoringService.extractKeywords("Machine   learning"))
        assertEquals(listOf("machine learning"), ATSScoringService.extractKeywords("Machine learning"))
    }

    @Test
    fun `bullet extraction keeps action lines and rejects repetitive noise`() {
        val text = """
            1) Worked on the internal release automation tooling
            Built a reliable deployment service for customer teams
            - aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
            - Too short
            Responsibilities:
        """.trimIndent()

        assertEquals(
            listOf(
                "Worked on the internal release automation tooling",
                "Built a reliable deployment service for customer teams",
            ),
            ATSScoringService.extractBullets(text),
        )
        assertTrue(ATSScoringService.isWeakBullet("Worked on the internal release automation tooling"))
        assertFalse(ATSScoringService.isValidBulletText("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))
        assertTrue(ATSScoringService.hasImpactSignal("Supported 2024 platform migration"))
    }

    @Test
    fun `empty inputs retain perfect empty keyword and impact denominator quirks`() {
        val result = ATSScoringService.analyzeResume("", "")

        assertEquals(78, result.score)
        assertEquals(100, result.keywordCoverage)
        assertEquals(100, result.componentScores["impact_quality"])
        assertEquals(0, result.estimatedResumeLengthWords)
    }
}
