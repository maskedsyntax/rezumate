package com.aftaab.rezumate.ui

import com.aftaab.rezumate.billing.BillingState
import com.aftaab.rezumate.data.local.UsageSnapshot
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppViewModelStateMappingTest {
    @Test
    fun `analysis waits until entitlement loading finishes`() {
        val uiState = RezumateState(
            usage = UsageSnapshot("2026-09-21", analysesUsed = 0, improvementsUsed = 0),
            billing = BillingState(entitlementLoaded = false),
        ).toAnalyzeUiState()

        assertEquals("Checking purchase...", uiState.planName)
        assertFalse(uiState.canAnalyze)
        assertFalse(uiState.canPurchasePro)
    }

    @Test
    fun `loaded free state exposes analysis and purchase only when pricing is available`() {
        val usage = UsageSnapshot("2026-09-21", analysesUsed = 0, improvementsUsed = 0)
        val withoutPrice = RezumateState(
            usage = usage,
            billing = BillingState(entitlementLoaded = true),
        ).toAnalyzeUiState()
        val withPrice = RezumateState(
            usage = usage,
            billing = BillingState(price = "₹699", entitlementLoaded = true),
        ).toAnalyzeUiState()

        assertTrue(withoutPrice.canAnalyze)
        assertFalse(withoutPrice.canPurchasePro)
        assertTrue(withPrice.canAnalyze)
        assertTrue(withPrice.canPurchasePro)
    }

    @Test
    fun `loaded free state enforces exhausted analysis allowance`() {
        val uiState = RezumateState(
            usage = UsageSnapshot("2026-09-21", analysesUsed = 3, improvementsUsed = 0),
            billing = BillingState(price = "₹699", entitlementLoaded = true),
        ).toAnalyzeUiState()

        assertFalse(uiState.canAnalyze)
        assertTrue(uiState.canPurchasePro)
    }
}
