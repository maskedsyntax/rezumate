package com.aftaab.rezumate.domain

interface ReviewPromptStore {
    suspend fun successfulAnalyses(): Int
    suspend fun successfulExports(): Int
    suspend fun lastPromptedVersion(): String?
    suspend fun setSuccessfulAnalyses(value: Int)
    suspend fun setSuccessfulExports(value: Int)
    suspend fun setLastPromptedVersion(value: String)
}

class InMemoryReviewPromptStore : ReviewPromptStore {
    private var analyses = 0
    private var exports = 0
    private var lastPrompted: String? = null

    override suspend fun successfulAnalyses(): Int = analyses
    override suspend fun successfulExports(): Int = exports
    override suspend fun lastPromptedVersion(): String? = lastPrompted
    override suspend fun setSuccessfulAnalyses(value: Int) {
        analyses = value
    }
    override suspend fun setSuccessfulExports(value: Int) {
        exports = value
    }
    override suspend fun setLastPromptedVersion(value: String) {
        lastPrompted = value
    }
}

class ReviewPromptTracker(
    private val store: ReviewPromptStore,
) {
    suspend fun recordSuccessfulAnalysis() {
        store.setSuccessfulAnalyses(store.successfulAnalyses() + 1)
    }

    suspend fun recordSuccessfulExport() {
        store.setSuccessfulExports(store.successfulExports() + 1)
    }

    suspend fun isEligible(marketingVersion: String): Boolean =
        store.successfulAnalyses() >= 2 &&
            store.successfulExports() >= 1 &&
            store.lastPromptedVersion() != marketingVersion

    suspend fun markPrompted(marketingVersion: String) {
        store.setLastPromptedVersion(marketingVersion)
    }
}
