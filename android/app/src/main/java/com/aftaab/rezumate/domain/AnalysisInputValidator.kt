package com.aftaab.rezumate.domain

enum class AnalysisInputError(val message: String) {
    ResumeHasNoText("No extractable resume text was found. Use a text-based PDF or DOCX file."),
    JobDescriptionTooShort(
        "Paste a fuller job description (at least 120 characters) so Rezumate can produce a meaningful comparison.",
    ),
    JobDescriptionTooLong(
        "Job descriptions can contain up to 5,000 characters. Shorten this one before analyzing.",
    ),
    NoSupportedKeywords(
        "Rezumate could not identify supported skills or tools in this job description. Paste the complete role description and try again.",
    ),
}

class AnalysisInputException(val error: AnalysisInputError) : IllegalArgumentException(error.message)

object AnalysisInputValidator {
    const val MINIMUM_JOB_DESCRIPTION_CHARACTERS = 120
    const val MAXIMUM_JOB_DESCRIPTION_CHARACTERS = 5_000

    fun validatedResumeText(value: String): String {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) throw AnalysisInputException(AnalysisInputError.ResumeHasNoText)
        return trimmed
    }

    fun validatedJobDescription(value: String): String {
        val trimmed = value.trim()
        when {
            trimmed.length < MINIMUM_JOB_DESCRIPTION_CHARACTERS ->
                throw AnalysisInputException(AnalysisInputError.JobDescriptionTooShort)
            trimmed.length > MAXIMUM_JOB_DESCRIPTION_CHARACTERS ->
                throw AnalysisInputException(AnalysisInputError.JobDescriptionTooLong)
            ATSScoringService.extractKeywords(trimmed).isEmpty() ->
                throw AnalysisInputException(AnalysisInputError.NoSupportedKeywords)
        }
        return trimmed
    }
}
