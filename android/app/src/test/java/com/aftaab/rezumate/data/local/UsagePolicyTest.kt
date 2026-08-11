package com.aftaab.rezumate.data.local

import org.junit.Assert.assertEquals
import org.junit.Test

class UsagePolicyTest {
    @Test
    fun `daily limits match iOS and remaining values clamp at zero`() {
        val snapshot = UsageSnapshot(
            dayKey = "2026-08-04",
            analysesUsed = 4,
            improvementsUsed = 2,
        )

        assertEquals(3, UsagePolicy.FREE_DAILY_ANALYSES)
        assertEquals(3, UsagePolicy.FREE_DAILY_IMPROVEMENTS)
        assertEquals(2, UsagePolicy.FREE_SAVED_VARIANTS)
        assertEquals(0, UsagePolicy.remainingAnalyses(snapshot))
        assertEquals(1, UsagePolicy.remainingImprovements(snapshot))
    }

    @Test
    fun `a snapshot from another local day resets both counters`() {
        val old = UsageSnapshot("2026-08-03", analysesUsed = 2, improvementsUsed = 3)

        assertEquals(
            UsageSnapshot("2026-08-04", analysesUsed = 0, improvementsUsed = 0),
            UsagePolicy.forDay(old, "2026-08-04"),
        )
    }
}
