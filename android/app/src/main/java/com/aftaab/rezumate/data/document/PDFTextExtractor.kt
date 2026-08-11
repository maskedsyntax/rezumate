package com.aftaab.rezumate.data.document

import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper

object PDFTextExtractor {
    fun extractText(data: ByteArray): ExtractionResult {
        val document = try {
            PDDocument.load(data)
        } catch (_: Exception) {
            return failedResult()
        }

        return document.use { pdf ->
            val pageCount = pdf.numberOfPages
            val textParts = mutableListOf<String>()
            val warnings = mutableListOf<String>()

            try {
                val stripper = PDFTextStripper()
                for (page in 1..pageCount) {
                    stripper.startPage = page
                    stripper.endPage = page
                    val pageText = stripper.getText(pdf).trim()
                    if (pageText.isEmpty()) {
                        warnings += "Page $page did not contain extractable text."
                    } else {
                        textParts += pageText
                    }
                }
            } catch (_: Exception) {
                return@use failedResult()
            }

            val text = normalizeResumeText(textParts.joinToString("\n\n"))
            evaluateExtractedText(text, warnings, pageCount)
        }
    }

    fun normalizeResumeText(text: String): String =
        ExtractedTextEvaluator.normalizeResumeText(text)

    fun deduplicateConsecutiveWords(text: String): String =
        ExtractedTextEvaluator.deduplicateConsecutiveWords(text)

    fun evaluateExtractedText(
        text: String,
        warnings: List<String>,
        pageCount: Int,
    ): ExtractionResult = ExtractedTextEvaluator.evaluate(text, warnings, pageCount)

    private fun failedResult() = ExtractionResult(
        text = "",
        status = ExtractionResult.STATUS_FAILED,
        warnings = listOf(
            "Could not read this PDF. Try exporting it again or uploading a text-based PDF.",
        ),
        pageCount = 0,
        characterCount = 0,
    )
}
