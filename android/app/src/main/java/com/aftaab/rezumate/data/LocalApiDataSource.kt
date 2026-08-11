package com.aftaab.rezumate.data

import android.net.Uri
import com.aftaab.rezumate.data.document.ContentUriDocumentImporter
import com.aftaab.rezumate.data.document.ImportedResume
import com.aftaab.rezumate.data.local.LocalStorageManager
import com.aftaab.rezumate.data.local.LocalVariantAdapter
import com.aftaab.rezumate.data.local.LocalVariantRecord
import com.aftaab.rezumate.data.local.VariantSaveLocation

/**
 * Local counterpart to the active iOS APIClient upload/history behavior. Analysis, rewriting, and
 * scoring remain domain concerns; adapters keep their eventual model types out of persistence.
 */
class LocalApiDataSource(
    private val importer: ContentUriDocumentImporter,
    private val storage: LocalStorageManager,
) {
    suspend fun uploadResume(uri: Uri): ImportedResume = importer.import(uri)

    suspend fun saveAnalyzedVariant(
        variant: LocalVariantRecord,
        shouldSave: Boolean = true,
        allowBeyondFreeLimit: Boolean = false,
    ): VariantSaveLocation {
        if (!shouldSave) {
            storage.saveTransientVariant(variant)
            return VariantSaveLocation.TRANSIENT
        }
        return storage.saveVariant(variant, allowBeyondFreeLimit)
    }

    suspend fun history(): List<LocalVariantRecord> = storage.loadHistory()

    suspend fun variant(id: String): LocalVariantRecord =
        storage.loadVariant(id) ?: throw LocalApiException("Variant not found.")

    suspend fun deleteVariant(id: String) = storage.deleteVariant(id)

    suspend fun <T> history(adapter: LocalVariantAdapter<T>): List<T> =
        history().map(adapter::fromRecord)

    suspend fun <T> variant(id: String, adapter: LocalVariantAdapter<T>): T =
        adapter.fromRecord(variant(id))
}

class LocalApiException(message: String) : Exception(message)
