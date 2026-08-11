package com.aftaab.rezumate.data.local

import java.io.File
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class LocalStorageManagerTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    @Test
    fun `new variants preserve newest-first history and enforce free limit`() = runBlocking {
        val file = File(temporaryFolder.root, LocalStorageManager.HISTORY_FILENAME)
        val storage = LocalStorageManager(file)

        assertEquals(VariantSaveLocation.PERSISTED, storage.saveVariant(variant("one")))
        assertEquals(VariantSaveLocation.PERSISTED, storage.saveVariant(variant("two")))
        assertEquals(VariantSaveLocation.TRANSIENT, storage.saveVariant(variant("three")))

        assertEquals(listOf("two", "one"), storage.loadHistory().map { it.id })
        assertEquals("three", storage.loadVariant("three")?.id)
        assertFalse(storage.canSaveNewVariant())

        val reloaded = LocalStorageManager(file)
        assertEquals(listOf("two", "one"), reloaded.loadHistory().map { it.id })
        assertNull(reloaded.loadVariant("three"))
    }

    @Test
    fun `updates remain in their original history position and transient updates stay transient`() =
        runBlocking {
            val file = File(temporaryFolder.root, LocalStorageManager.HISTORY_FILENAME)
            val storage = LocalStorageManager(file)
            storage.saveVariant(variant("one"))
            storage.saveVariant(variant("two"))
            storage.saveTransientVariant(variant("temporary"))

            storage.updateVariant(variant("one", name = "Updated"))
            storage.updateVariant(variant("temporary", name = "Transient update"))

            assertEquals(listOf("two", "one"), storage.loadHistory().map { it.id })
            assertEquals("Updated", storage.loadVariant("one")?.variantName)
            assertEquals("Transient update", storage.loadVariant("temporary")?.variantName)
            storage.clearTransientVariants()
            assertNull(storage.loadVariant("temporary"))
        }

    @Test
    fun `delete rewrites valid JSON and frees capacity`() = runBlocking {
        val file = File(temporaryFolder.root, LocalStorageManager.HISTORY_FILENAME)
        val storage = LocalStorageManager(file)
        storage.saveVariant(variant("one"))
        storage.saveVariant(variant("two"))

        storage.deleteVariant("one")

        assertEquals(listOf("two"), storage.loadHistory().map { it.id })
        assertTrue(storage.canSaveNewVariant())
        assertFalse(file.readText().contains("\"id\": \"one\""))
    }

    private fun variant(id: String, name: String = id) = LocalVariantRecord(
        id = id,
        resumeId = "resume-$id",
        variantName = name,
        tailoredContent = "Resume text",
        atsScore = 75,
        analysisFeedback = buildJsonObject { put("score", 75) },
        createdAt = "2026-08-04T10:00:00Z",
        updatedAt = "2026-08-04T10:00:00Z",
    )
}
