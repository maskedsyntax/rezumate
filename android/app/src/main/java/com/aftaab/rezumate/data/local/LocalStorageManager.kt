package com.aftaab.rezumate.data.local

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.UUID
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

/** Stable persistence shape. Domain UUID/date/analysis types should be mapped at this boundary. */
@Serializable
data class LocalVariantRecord(
    val id: String,
    val resumeId: String,
    val variantName: String,
    val tailoredContent: String,
    val atsScore: Int,
    val analysisFeedback: JsonObject,
    val createdAt: String,
    val updatedAt: String,
    val jobDescription: String = "",
)

enum class VariantSaveLocation {
    PERSISTED,
    TRANSIENT,
}

interface LocalVariantAdapter<T> {
    fun toRecord(variant: T): LocalVariantRecord

    fun fromRecord(record: LocalVariantRecord): T
}

class LocalStorageManager(
    private val historyFile: File,
    private val json: Json = DEFAULT_JSON,
) {
    constructor(context: Context) : this(File(context.filesDir, HISTORY_FILENAME))

    private val mutex = Mutex()
    private val transientVariants = linkedMapOf<String, LocalVariantRecord>()

    /**
     * Updates an existing saved variant, or saves a new one while capacity remains. A new
     * free-tier variant over capacity remains usable for this process but is not added to history.
     */
    suspend fun saveVariant(
        variant: LocalVariantRecord,
        allowBeyondFreeLimit: Boolean = false,
    ): VariantSaveLocation = mutex.withLock {
        val history = readHistory().toMutableList()
        val existingIndex = history.indexOfFirst { it.id == variant.id }
        if (existingIndex >= 0) {
            history[existingIndex] = variant
            writeHistory(history)
            transientVariants.remove(variant.id)
            return@withLock VariantSaveLocation.PERSISTED
        }

        if (allowBeyondFreeLimit || history.size < FREE_SAVED_VARIANTS) {
            history.add(0, variant)
            writeHistory(history)
            transientVariants.remove(variant.id)
            VariantSaveLocation.PERSISTED
        } else {
            transientVariants[variant.id] = variant
            VariantSaveLocation.TRANSIENT
        }
    }

    suspend fun saveTransientVariant(variant: LocalVariantRecord) = mutex.withLock {
        transientVariants[variant.id] = variant
    }

    suspend fun loadVariant(id: String): LocalVariantRecord? = mutex.withLock {
        transientVariants[id] ?: readHistory().firstOrNull { it.id == id }
    }

    suspend fun updateVariant(variant: LocalVariantRecord): VariantSaveLocation = mutex.withLock {
        if (transientVariants.containsKey(variant.id)) {
            transientVariants[variant.id] = variant
            VariantSaveLocation.TRANSIENT
        } else {
            val history = readHistory().toMutableList()
            val existingIndex = history.indexOfFirst { it.id == variant.id }
            if (existingIndex >= 0) {
                history[existingIndex] = variant
                writeHistory(history)
                VariantSaveLocation.PERSISTED
            } else if (history.size < FREE_SAVED_VARIANTS) {
                history.add(0, variant)
                writeHistory(history)
                VariantSaveLocation.PERSISTED
            } else {
                transientVariants[variant.id] = variant
                VariantSaveLocation.TRANSIENT
            }
        }
    }

    suspend fun clearTransientVariants() = mutex.withLock {
        transientVariants.clear()
    }

    suspend fun loadHistory(): List<LocalVariantRecord> = mutex.withLock {
        readHistory()
    }

    suspend fun canSaveNewVariant(): Boolean = mutex.withLock {
        readHistory().size < FREE_SAVED_VARIANTS
    }

    suspend fun deleteVariant(id: String) = mutex.withLock {
        val history = readHistory().filterNot { it.id == id }
        writeHistory(history)
    }

    private fun readHistory(): List<LocalVariantRecord> {
        if (!historyFile.isFile) return emptyList()
        return runCatching {
            json.decodeFromString<List<LocalVariantRecord>>(historyFile.readText(Charsets.UTF_8))
        }.getOrDefault(emptyList())
    }

    private fun writeHistory(history: List<LocalVariantRecord>) {
        val parent = historyFile.parentFile
            ?: error("History file must have a parent directory")
        check(parent.exists() || parent.mkdirs()) { "Could not create variant storage directory" }

        val temporaryFile = File(parent, ".${historyFile.name}.${UUID.randomUUID()}.tmp")
        try {
            FileOutputStream(temporaryFile).use { output ->
                output.write(json.encodeToString(history).toByteArray(Charsets.UTF_8))
                output.fd.sync()
            }
            try {
                Files.move(
                    temporaryFile.toPath(),
                    historyFile.toPath(),
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING,
                )
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(
                    temporaryFile.toPath(),
                    historyFile.toPath(),
                    StandardCopyOption.REPLACE_EXISTING,
                )
            }
        } finally {
            temporaryFile.delete()
        }
    }

    companion object {
        const val FREE_SAVED_VARIANTS = 2
        const val HISTORY_FILENAME = "rezumate_history.json"

        private val DEFAULT_JSON = Json {
            prettyPrint = true
            ignoreUnknownKeys = true
            explicitNulls = false
        }
    }
}
