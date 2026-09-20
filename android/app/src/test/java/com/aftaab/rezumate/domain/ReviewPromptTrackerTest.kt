package com.aftaab.rezumate.domain

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReviewPromptTrackerTest {
    @Test
    fun `requires two analyses and one export and prompts once per version`() = runBlocking {
        val tracker = ReviewPromptTracker(InMemoryReviewPromptStore())

        assertFalse(tracker.isEligible("1.0.3"))

        tracker.recordSuccessfulAnalysis()
        tracker.recordSuccessfulExport()
        assertFalse(tracker.isEligible("1.0.3"))

        tracker.recordSuccessfulAnalysis()
        assertTrue(tracker.isEligible("1.0.3"))

        tracker.markPrompted("1.0.3")
        assertFalse(tracker.isEligible("1.0.3"))
        assertTrue(tracker.isEligible("1.0.4"))
    }
}
