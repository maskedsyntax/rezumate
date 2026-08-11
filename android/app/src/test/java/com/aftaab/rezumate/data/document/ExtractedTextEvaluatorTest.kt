package com.aftaab.rezumate.data.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ExtractedTextEvaluatorTest {
    @Test
    fun `normalization matches iOS whitespace and duplicate handling`() {
        val source = "  Jane   Doe\r\n\r\n\r\nBuilt Built Built APIs\rHad had impact  "

        assertEquals(
            "Jane Doe\n\nBuilt APIs\nHad had impact",
            PDFTextExtractor.normalizeResumeText(source),
        )
    }

    @Test
    fun `empty and short text receive active iOS statuses and warnings`() {
        val empty = PDFTextExtractor.evaluateExtractedText("", emptyList(), pageCount = 2)
        val short = PDFTextExtractor.evaluateExtractedText("Jane Doe\nEngineer", emptyList(), pageCount = 1)

        assertEquals(ExtractionResult.STATUS_EMPTY, empty.status)
        assertTrue(empty.warnings.contains("No extractable resume text was found."))
        assertEquals(ExtractionResult.STATUS_LOW_QUALITY, short.status)
        assertTrue(short.warnings.any { it.startsWith("Very little text") })
        assertTrue(short.warnings.any { it.contains("very few line breaks") })
    }

    @Test
    fun `four-line text over 400 characters is ok without quality warnings`() {
        val text = List(4) { "x".repeat(110) }.joinToString("\n")

        val result = PDFTextExtractor.evaluateExtractedText(text, emptyList(), pageCount = 1)

        assertEquals(ExtractionResult.STATUS_OK, result.status)
        assertEquals(text.length, result.characterCount)
        assertTrue(result.warnings.isEmpty())
    }
}
