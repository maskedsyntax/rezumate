package com.aftaab.rezumate.billing

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BillingStateLogicTest {
    @Test
    fun `entitlement requires both verification and acknowledgement`() {
        val verifiedOnly = BillingStateLogic.verificationFinished(
            BillingState(isPurchasing = true),
            PaymentVerificationResponse(verified = true, acknowledged = false),
        )
        val acknowledgedOnly = BillingStateLogic.verificationFinished(
            BillingState(isPurchasing = true),
            PaymentVerificationResponse(verified = false, acknowledged = true),
        )
        val complete = BillingStateLogic.verificationFinished(
            BillingState(isPurchasing = true),
            PaymentVerificationResponse(verified = true, acknowledged = true),
        )

        assertFalse(verifiedOnly.isPro)
        assertFalse(acknowledgedOnly.isPro)
        assertTrue(complete.isPro)
        assertFalse(complete.isPurchasing)
    }

    @Test
    fun `pending purchase never unlocks pro`() {
        val state = BillingStateLogic.purchasePending(BillingState(isPurchasing = true))

        assertFalse(state.isPro)
        assertFalse(state.isPurchasing)
    }

    @Test
    fun `authoritative empty purchase result removes entitlement`() {
        val state = BillingStateLogic.noOwnedPurchase(
            BillingState(isPro = true, isPurchasing = true),
            showMessage = false,
        )

        assertFalse(state.isPro)
        assertFalse(state.isPurchasing)
    }
}
