package com.aftaab.rezumate.data.document

enum class ResumeDocumentType(
    val extension: String,
    val mimeType: String,
) {
    PDF("pdf", "application/pdf"),
    DOCX("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
}

data class ValidatedDocument(
    val filename: String,
    val type: ResumeDocumentType,
)

class DocumentValidationException(message: String) : IllegalArgumentException(message)

object DocumentValidator {
    fun validate(filename: String?, mimeType: String?): ValidatedDocument {
        val safeFilename = sanitizeFilename(filename)
        val extension = safeFilename.substringAfterLast('.', missingDelimiterValue = "").lowercase()
        val extensionType = extension.toDocumentType()
        val normalizedMime = mimeType?.substringBefore(';')?.trim()?.lowercase().orEmpty()
        val mimeDocumentType = normalizedMime.toMimeDocumentType()

        if (extension.isNotEmpty() && extensionType == null) {
            throw DocumentValidationException("Only PDF and DOCX resumes are supported.")
        }

        if (extensionType != null && mimeDocumentType != null && extensionType != mimeDocumentType) {
            throw DocumentValidationException("The document filename and MIME type do not match.")
        }

        if (normalizedMime.isNotEmpty() && mimeDocumentType == null && normalizedMime !in GENERIC_MIME_TYPES) {
            throw DocumentValidationException("Only PDF and DOCX resumes are supported.")
        }

        val type = extensionType ?: mimeDocumentType
            ?: throw DocumentValidationException("Only PDF and DOCX resumes are supported.")
        val filenameWithExtension = when {
            safeFilename.isEmpty() -> "resume.${type.extension}"
            extension.isEmpty() ->
                "$safeFilename.${type.extension}"
            else -> safeFilename
        }
        return ValidatedDocument(filenameWithExtension, type)
    }

    private fun sanitizeFilename(filename: String?): String = filename
        .orEmpty()
        .trim()
        .substringAfterLast('/')
        .substringAfterLast('\\')
        .trim()

    private fun String.toDocumentType(): ResumeDocumentType? = when (this) {
        ResumeDocumentType.PDF.extension -> ResumeDocumentType.PDF
        ResumeDocumentType.DOCX.extension -> ResumeDocumentType.DOCX
        else -> null
    }

    private fun String.toMimeDocumentType(): ResumeDocumentType? = when (this) {
        "application/pdf", "application/x-pdf" -> ResumeDocumentType.PDF
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ->
            ResumeDocumentType.DOCX
        else -> null
    }

    private val GENERIC_MIME_TYPES = setOf(
        "application/octet-stream",
        "application/zip",
        "application/x-zip-compressed",
    )
}
