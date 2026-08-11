package com.aftaab.rezumate.data.document

import android.content.ContentResolver
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import java.io.FileNotFoundException
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class ImportedResume(
    val filename: String,
    val resumeId: String,
    val extractedText: String,
    val warnings: List<String>,
    val characterCount: Int,
)

class DocumentImportException(message: String, cause: Throwable? = null) : Exception(message, cause)

class ContentUriDocumentImporter(
    private val contentResolver: ContentResolver,
) {
    suspend fun import(uri: Uri): ImportedResume = withContext(Dispatchers.IO) {
        val displayName = queryDisplayName(uri) ?: uri.lastPathSegment
        val validated = try {
            DocumentValidator.validate(displayName, contentResolver.getType(uri))
        } catch (error: DocumentValidationException) {
            throw DocumentImportException(error.message ?: "Unsupported document.", error)
        }

        val data = try {
            contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: throw FileNotFoundException("Content provider returned no document data")
        } catch (error: Exception) {
            throw DocumentImportException("The selected resume could not be read.", error)
        }

        val extraction = when (validated.type) {
            ResumeDocumentType.PDF -> PDFTextExtractor.extractText(data)
            ResumeDocumentType.DOCX -> DocxTextExtractor.extractText(data)
        }
        if (extraction.status == ExtractionResult.STATUS_FAILED) {
            throw DocumentImportException(
                extraction.warnings.firstOrNull() ?: "Failed to extract text from document.",
            )
        }

        ImportedResume(
            filename = validated.filename,
            resumeId = UUID.randomUUID().toString(),
            extractedText = extraction.text,
            warnings = extraction.warnings,
            characterCount = extraction.characterCount,
        )
    }

    /** Call for ACTION_OPEN_DOCUMENT results when the app needs access after process restart. */
    fun takePersistableReadPermission(uri: Uri): Boolean = try {
        contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        true
    } catch (_: SecurityException) {
        false
    }

    private fun queryDisplayName(uri: Uri): String? = runCatching {
        contentResolver.query(uri, DISPLAY_NAME_PROJECTION, null, null, null)?.use { cursor ->
            cursor.displayName()
        }
    }.getOrNull()

    private fun Cursor.displayName(): String? {
        if (!moveToFirst()) return null
        val index = getColumnIndex(OpenableColumns.DISPLAY_NAME)
        return if (index >= 0 && !isNull(index)) getString(index) else null
    }

    private companion object {
        val DISPLAY_NAME_PROJECTION = arrayOf(OpenableColumns.DISPLAY_NAME)
    }
}
