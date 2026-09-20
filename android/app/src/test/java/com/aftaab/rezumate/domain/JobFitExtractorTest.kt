package com.aftaab.rezumate.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class JobFitExtractorTest {
    @Test
    fun `extracts hiring title and does not add it to keywords`() {
        val jd = "We are hiring a product-focused software engineer to build accessible mobile apps with React."
        val resume = "Alex Doe\nSUMMARY\nBackend engineer focused on APIs.\nEXPERIENCE\nAcme\nEngineer"
        val fit = JobFitExtractor.extract(jd, resume)
        val analysis = ATSScoringService.analyzeResume(resume, jd)

        assertEquals("product-focused software engineer", fit.jobTitle)
        assertFalse(fit.jobTitleMatched)
        assertNull(fit.educationRequirement)
        assertFalse(analysis.jdKeywords.any { it.contains("software engineer", ignoreCase = true) })
    }

    @Test
    fun `matches title and education when present on resume`() {
        val jd = """
            Title: iOS Engineer
            Bachelor's degree required. Build Swift apps with UIKit.
        """.trimIndent()
        val resume = """
            Jordan Lee
            iOS Engineer

            EDUCATION
            State University
            B.S. Computer Science
        """.trimIndent()
        val fit = JobFitExtractor.extract(jd, resume)

        assertEquals("iOS Engineer", fit.jobTitle)
        assertTrue(fit.jobTitleMatched)
        assertEquals("Bachelor's degree", fit.educationRequirement)
        assertTrue(fit.educationMatched)
    }
}
