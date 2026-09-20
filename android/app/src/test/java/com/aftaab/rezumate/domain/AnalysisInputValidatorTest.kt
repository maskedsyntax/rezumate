package com.aftaab.rezumate.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class AnalysisInputValidatorTest {
    @Test
    fun `rejects blank resume text`() {
        val error = assertThrows(AnalysisInputException::class.java) {
            AnalysisInputValidator.validatedResumeText(" \n ")
        }
        assertEquals(AnalysisInputError.ResumeHasNoText, error.error)
    }

    @Test
    fun `rejects short job description`() {
        val error = assertThrows(AnalysisInputException::class.java) {
            AnalysisInputValidator.validatedJobDescription("Python role")
        }
        assertEquals(AnalysisInputError.JobDescriptionTooShort, error.error)
    }

    @Test
    fun `rejects long job description`() {
        val description = "Python ".repeat(800)
        val error = assertThrows(AnalysisInputException::class.java) {
            AnalysisInputValidator.validatedJobDescription(description)
        }
        assertEquals(AnalysisInputError.JobDescriptionTooLong, error.error)
    }

    @Test
    fun `rejects description without supported keywords`() {
        val description = "Coordinate partners and communicate clearly across multiple teams and business functions. ".repeat(3)
        val error = assertThrows(AnalysisInputException::class.java) {
            AnalysisInputValidator.validatedJobDescription(description)
        }
        assertEquals(AnalysisInputError.NoSupportedKeywords, error.error)
    }

    @Test
    fun `accepts complete description with supported keywords`() {
        val description =
            "Build accessible web applications with React and TypeScript. Work with product and design partners, review code, improve quality, and ship reliable customer experiences across the frontend platform."
        assertEquals(description, AnalysisInputValidator.validatedJobDescription(description))
    }
}
