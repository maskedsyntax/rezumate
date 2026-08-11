package com.aftaab.rezumate.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import java.time.Clock
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val Context.rezumateUsageDataStore by preferencesDataStore(name = "rezumate_usage")

data class UsageSnapshot(
    val dayKey: String,
    val analysesUsed: Int,
    val improvementsUsed: Int,
)

object UsagePolicy {
    const val FREE_DAILY_ANALYSES = 3
    const val FREE_DAILY_IMPROVEMENTS = 3
    const val FREE_SAVED_VARIANTS = LocalStorageManager.FREE_SAVED_VARIANTS

    fun remainingAnalyses(snapshot: UsageSnapshot): Int =
        (FREE_DAILY_ANALYSES - snapshot.analysesUsed).coerceAtLeast(0)

    fun remainingImprovements(snapshot: UsageSnapshot): Int =
        (FREE_DAILY_IMPROVEMENTS - snapshot.improvementsUsed).coerceAtLeast(0)

    fun forDay(snapshot: UsageSnapshot?, dayKey: String): UsageSnapshot =
        if (snapshot == null || snapshot.dayKey != dayKey) {
            UsageSnapshot(dayKey = dayKey, analysesUsed = 0, improvementsUsed = 0)
        } else {
            snapshot
        }
}

class UsageLimiter(
    private val dataStore: DataStore<Preferences>,
    private val clock: Clock = Clock.systemDefaultZone(),
) {
    constructor(context: Context) : this(context.applicationContext.rezumateUsageDataStore)

    suspend fun loadSnapshot(): UsageSnapshot {
        val today = currentDayKey()
        var result = UsageSnapshot(today, analysesUsed = 0, improvementsUsed = 0)
        dataStore.edit { preferences ->
            result = UsagePolicy.forDay(preferences.toSnapshot(), today)
            preferences.putSnapshot(result)
        }
        return result
    }

    suspend fun recordAnalysis(): UsageSnapshot = updateToday { snapshot ->
        snapshot.copy(analysesUsed = snapshot.analysesUsed + 1)
    }

    suspend fun recordImprovement(): UsageSnapshot = updateToday { snapshot ->
        snapshot.copy(improvementsUsed = snapshot.improvementsUsed + 1)
    }

    fun remainingAnalyses(snapshot: UsageSnapshot): Int = UsagePolicy.remainingAnalyses(snapshot)

    fun remainingImprovements(snapshot: UsageSnapshot): Int = UsagePolicy.remainingImprovements(snapshot)

    private suspend fun updateToday(update: (UsageSnapshot) -> UsageSnapshot): UsageSnapshot {
        val today = currentDayKey()
        var result = UsageSnapshot(today, analysesUsed = 0, improvementsUsed = 0)
        dataStore.edit { preferences ->
            val current = UsagePolicy.forDay(preferences.toSnapshot(), today)
            result = update(current)
            preferences.putSnapshot(result)
        }
        return result
    }

    private fun currentDayKey(): String =
        LocalDate.now(clock).format(DateTimeFormatter.ISO_LOCAL_DATE)

    private fun Preferences.toSnapshot(): UsageSnapshot? {
        val dayKey = this[DAY_KEY] ?: return null
        return UsageSnapshot(
            dayKey = dayKey,
            analysesUsed = this[ANALYSES_USED] ?: 0,
            improvementsUsed = this[IMPROVEMENTS_USED] ?: 0,
        )
    }

    private fun androidx.datastore.preferences.core.MutablePreferences.putSnapshot(
        snapshot: UsageSnapshot,
    ) {
        this[DAY_KEY] = snapshot.dayKey
        this[ANALYSES_USED] = snapshot.analysesUsed
        this[IMPROVEMENTS_USED] = snapshot.improvementsUsed
    }

    companion object {
        const val FREE_DAILY_ANALYSES = UsagePolicy.FREE_DAILY_ANALYSES
        const val FREE_DAILY_IMPROVEMENTS = UsagePolicy.FREE_DAILY_IMPROVEMENTS
        const val FREE_SAVED_VARIANTS = UsagePolicy.FREE_SAVED_VARIANTS

        private val DAY_KEY = stringPreferencesKey("day_key")
        private val ANALYSES_USED = intPreferencesKey("analyses_used")
        private val IMPROVEMENTS_USED = intPreferencesKey("improvements_used")
    }
}
