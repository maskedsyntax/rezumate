package com.aftaab.rezumate.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.aftaab.rezumate.domain.ReviewPromptStore
import kotlinx.coroutines.flow.first

private val Context.rezumateReviewDataStore by preferencesDataStore(name = "rezumate_review")

class DataStoreReviewPromptStore(
    context: Context,
) : ReviewPromptStore {
    private val dataStore = context.applicationContext.rezumateReviewDataStore

    override suspend fun successfulAnalyses(): Int =
        dataStore.data.first()[ANALYSES] ?: 0

    override suspend fun successfulExports(): Int =
        dataStore.data.first()[EXPORTS] ?: 0

    override suspend fun lastPromptedVersion(): String? =
        dataStore.data.first()[LAST_PROMPTED]

    override suspend fun setSuccessfulAnalyses(value: Int) {
        dataStore.edit { it[ANALYSES] = value }
    }

    override suspend fun setSuccessfulExports(value: Int) {
        dataStore.edit { it[EXPORTS] = value }
    }

    override suspend fun setLastPromptedVersion(value: String) {
        dataStore.edit { it[LAST_PROMPTED] = value }
    }

    private companion object {
        val ANALYSES = intPreferencesKey("successful_analyses")
        val EXPORTS = intPreferencesKey("successful_exports")
        val LAST_PROMPTED = stringPreferencesKey("last_prompted_version")
    }
}
