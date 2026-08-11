package com.aftaab.rezumate.data.document

data class ExtractionResult(
    val text: String,
    val status: String,
    val warnings: List<String>,
    val pageCount: Int,
    val characterCount: Int,
) {
    companion object {
        const val STATUS_FAILED = "failed"
        const val STATUS_EMPTY = "empty"
        const val STATUS_LOW_QUALITY = "low_quality"
        const val STATUS_OK = "ok"
    }
}

internal object ExtractedTextEvaluator {
    fun normalizeResumeText(text: String): String {
        val normalizedLines = mutableListOf<String>()
        var previousBlank = false

        text.replace("\r\n", "\n")
            .replace('\r', '\n')
            .split('\n')
            .forEach { line ->
                val cleaned = line.trim().split(WHITESPACE).filter { it.isNotEmpty() }.joinToString(" ")
                val isBlank = cleaned.isEmpty()
                if (!(isBlank && previousBlank)) normalizedLines += cleaned
                previousBlank = isBlank
            }

        return deduplicateConsecutiveWords(normalizedLines.joinToString("\n").trim())
    }

    fun deduplicateConsecutiveWords(text: String): String =
        text.split('\n').joinToString("\n") { line ->
            val words = line.split(' ')
            val cleanedWords = mutableListOf<String>()
            var index = 0

            while (index < words.size) {
                val currentWord = words[index]
                val cleanCurrent = currentWord.trim(NON_ALPHANUMERIC).lowercase()
                if (cleanCurrent.isEmpty()) {
                    cleanedWords += currentWord
                    index += 1
                    continue
                }

                var runLength = 1
                while (index + runLength < words.size) {
                    val cleanNext = words[index + runLength]
                        .trim(NON_ALPHANUMERIC)
                        .lowercase()
                    if (cleanNext != cleanCurrent) break
                    runLength += 1
                }

                if (runLength >= 3) {
                    cleanedWords += currentWord
                } else {
                    repeat(runLength) { offset -> cleanedWords += words[index + offset] }
                }
                index += runLength
            }
            cleanedWords.joinToString(" ")
        }

    fun evaluate(
        text: String,
        warnings: List<String>,
        pageCount: Int,
    ): ExtractionResult {
        val mutableWarnings = warnings.toMutableList()
        val status = when {
            text.isEmpty() -> {
                mutableWarnings += "No extractable resume text was found."
                ExtractionResult.STATUS_EMPTY
            }
            text.length < 400 -> {
                mutableWarnings += "Very little text was extracted, so the analysis may be incomplete."
                ExtractionResult.STATUS_LOW_QUALITY
            }
            else -> ExtractionResult.STATUS_OK
        }

        if (text.isNotEmpty() && text.split('\n').size < 4) {
            mutableWarnings +=
                "The extracted text has very few line breaks, which can reduce section detection accuracy."
        }

        return ExtractionResult(
            text = text,
            status = status,
            warnings = mutableWarnings,
            pageCount = pageCount,
            characterCount = text.length,
        )
    }

    private val WHITESPACE = Regex("[\\p{Z}\\s]+")
    private val NON_ALPHANUMERIC: (Char) -> Boolean = { !it.isLetterOrDigit() }
}
