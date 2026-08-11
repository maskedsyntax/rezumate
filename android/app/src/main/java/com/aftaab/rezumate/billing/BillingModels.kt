package com.aftaab.rezumate.billing

import kotlinx.serialization.Serializable

const val REZUMATE_PRO_PRODUCT_ID = "rezumate_pro_lifetime"

data class BillingState(
    val price: String? = null,
    val isPro: Boolean = false,
    val isPurchasing: Boolean = false,
    val message: String? = null,
)

@Serializable
data class PaymentVerificationRequest(
    val purchaseToken: String,
    val productId: String,
    val packageName: String,
    val integrityToken: String = "",
)

@Serializable
data class PaymentVerificationResponse(
    val verified: Boolean = false,
    val acknowledged: Boolean = false,
    val message: String? = null,
)

object BillingStateLogic {
    fun productLoaded(state: BillingState, price: String): BillingState = state.copy(
        price = price,
        message = null,
    )

    fun purchaseStarted(state: BillingState): BillingState = state.copy(
        isPurchasing = true,
        message = null,
    )

    fun purchaseStopped(state: BillingState, message: String): BillingState = state.copy(
        isPurchasing = false,
        message = message,
    )

    fun purchasePending(state: BillingState): BillingState = state.copy(
        isPurchasing = false,
        message = "Purchase is pending.",
    )

    fun verificationStarted(state: BillingState): BillingState = state.copy(
        isPurchasing = true,
        message = "Verifying purchase...",
    )

    fun verificationFinished(
        state: BillingState,
        response: PaymentVerificationResponse,
    ): BillingState {
        val entitled = response.verified && response.acknowledged
        val defaultMessage = when {
            entitled -> "Purchase verified."
            response.verified -> "Purchase verified but not acknowledged. Try restoring again."
            else -> "Purchase could not be verified."
        }
        return state.copy(
            isPro = entitled,
            isPurchasing = false,
            message = response.message?.takeIf(String::isNotBlank) ?: defaultMessage,
        )
    }

    fun noOwnedPurchase(state: BillingState, showMessage: Boolean): BillingState = state.copy(
        isPro = false,
        isPurchasing = false,
        message = if (showMessage) "No completed purchase was found." else null,
    )
}
