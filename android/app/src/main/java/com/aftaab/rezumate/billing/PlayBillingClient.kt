package com.aftaab.rezumate.billing

import android.app.Activity
import android.content.Context
import androidx.annotation.MainThread
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import java.io.IOException
import kotlin.math.min
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class PlayBillingClient(
    context: Context,
    private val paymentBackend: PaymentBackend = PaymentBackendClient(context.applicationContext),
) : PurchasesUpdatedListener, AutoCloseable {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val reconciliationMutex = Mutex()
    private val _state = MutableStateFlow(BillingState())
    private val billingClient = BillingClient.newBuilder(appContext)
        .setListener(this)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
        )
        .build()

    val state: StateFlow<BillingState> = _state.asStateFlow()

    private var productDetails: ProductDetails? = null
    private var connecting = false
    private var closed = false
    private var recoveryAttempt = 0
    private var recoveryJob: Job? = null
    private var restoreRequested = false
    private var reconciliationGeneration = 0L
    private var verificationJob: Job? = null

    init {
        BillingReconciliationScheduler.ensurePeriodic(appContext)
        connect()
    }

    @MainThread
    fun launchPurchase(activity: Activity) {
        val details = productDetails
        if (!billingClient.isReady || details == null) {
            _state.value = BillingStateLogic.purchaseStopped(
                _state.value,
                "Store details are not ready. Try again.",
            )
            retry()
            return
        }

        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details)
                        .build(),
                ),
            )
            .build()
        _state.value = BillingStateLogic.purchaseStarted(_state.value)
        handleLaunchResult(billingClient.launchBillingFlow(activity, params))
    }

    fun restorePurchases() {
        restoreRequested = true
        _state.value = _state.value.copy(message = "Restoring purchase...")
        if (billingClient.isReady) {
            queryPurchases(showEmptyMessage = true)
        } else {
            connect()
        }
    }

    fun retry() {
        if (billingClient.isReady) {
            queryProductDetails()
            queryPurchases(showEmptyMessage = false)
        } else {
            connect()
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> reconcilePurchases(
                purchases.orEmpty(),
                showEmptyMessage = true,
            )
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                _state.value = BillingStateLogic.purchaseStopped(_state.value, "Purchase cancelled.")
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                _state.value = BillingStateLogic.purchaseStopped(
                    _state.value,
                    "Item is already owned. Restoring purchase...",
                )
                restorePurchases()
            }
            else -> handleBillingFailure(result, "Purchase could not be completed.")
        }
    }

    override fun close() {
        closed = true
        recoveryJob?.cancel()
        verificationJob?.cancel()
        scope.cancel()
        billingClient.endConnection()
    }

    private fun connect() {
        if (closed || connecting || billingClient.isReady) return
        connecting = true
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connecting = false
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    recoveryAttempt = 0
                    recoveryJob?.cancel()
                    queryProductDetails()
                    queryPurchases(showEmptyMessage = restoreRequested)
                } else {
                    handleBillingFailure(result, "Could not connect to Google Play.")
                }
            }

            override fun onBillingServiceDisconnected() {
                connecting = false
                _state.value = _state.value.copy(message = "Google Play disconnected. Reconnecting...")
                scheduleRecovery()
            }
        })
    }

    private fun queryProductDetails() {
        if (!billingClient.isReady) return
        val product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(REZUMATE_PRO_PRODUCT_ID)
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(product))
            .build()

        billingClient.queryProductDetailsAsync(params) { result, products ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                handleBillingFailure(result, "Could not load the product price.")
                return@queryProductDetailsAsync
            }
            val details = products.firstOrNull { it.productId == REZUMATE_PRO_PRODUCT_ID }
            productDetails = details
            val price = details?.oneTimePurchaseOfferDetails?.formattedPrice
            if (price != null) {
                _state.value = BillingStateLogic.productLoaded(_state.value, price)
            } else {
                _state.value = _state.value.copy(message = "Product is unavailable in Google Play.")
            }
        }
    }

    private fun queryPurchases(showEmptyMessage: Boolean) {
        if (!billingClient.isReady) return
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        billingClient.queryPurchasesAsync(params) { result, purchases ->
            restoreRequested = false
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                reconcilePurchases(purchases, showEmptyMessage)
            } else {
                handleBillingFailure(result, "Could not restore purchases.")
            }
        }
    }

    private fun reconcilePurchases(purchases: List<Purchase>, showEmptyMessage: Boolean) {
        val generation = ++reconciliationGeneration
        verificationJob?.cancel()
        val matching = purchases.filter { REZUMATE_PRO_PRODUCT_ID in it.products }
        val completed = matching.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
        if (completed.isEmpty()) {
            if (matching.any { it.purchaseState == Purchase.PurchaseState.PENDING }) {
                _state.value = BillingStateLogic.purchasePending(_state.value)
            } else {
                _state.value = BillingStateLogic.noOwnedPurchase(_state.value, showEmptyMessage)
            }
            return
        }

        verificationJob = scope.launch {
            reconciliationMutex.withLock {
                _state.value = BillingStateLogic.verificationStarted(_state.value)
                var accepted: PaymentVerificationResponse? = null
                var rejection: PaymentVerificationResponse? = null
                for (purchase in completed.distinctBy(Purchase::getPurchaseToken)) {
                    val response = verifyWithRetry(purchase.purchaseToken)
                    if (response.verified && response.acknowledged) {
                        accepted = response
                        break
                    }
                    rejection = response
                }
                if (generation != reconciliationGeneration) return@withLock
                _state.value = BillingStateLogic.verificationFinished(
                    _state.value,
                    accepted ?: rejection ?: PaymentVerificationResponse(),
                )
            }
        }
    }

    private suspend fun verifyWithRetry(purchaseToken: String): PaymentVerificationResponse {
        val request = PaymentVerificationRequest(
            purchaseToken = purchaseToken,
            productId = REZUMATE_PRO_PRODUCT_ID,
            packageName = appContext.packageName,
        )
        var lastError: PaymentBackendException? = null
        for (attempt in 0 until BACKEND_ATTEMPTS) {
            try {
                return paymentBackend.verify(request)
            } catch (error: PaymentBackendException) {
                lastError = error
                if (!error.retryable || attempt == BACKEND_ATTEMPTS - 1) break
                delay(BACKEND_RETRY_DELAY_MS * (attempt + 1))
            } catch (error: IOException) {
                lastError = PaymentBackendException(
                    message = error.message ?: "Could not reach the payment backend.",
                    retryable = true,
                    cause = error,
                )
                if (attempt == BACKEND_ATTEMPTS - 1) break
                delay(BACKEND_RETRY_DELAY_MS * (attempt + 1))
            } catch (error: Exception) {
                lastError = PaymentBackendException(
                    message = error.message ?: "Purchase verification failed.",
                    retryable = false,
                    cause = error,
                )
                break
            }
        }
        return PaymentVerificationResponse(
            message = lastError?.message ?: "Purchase verification failed.",
        ).also {
            if (lastError?.retryable == true) {
                BillingReconciliationScheduler.scheduleImmediate(appContext)
            }
        }
    }

    private fun handleLaunchResult(result: BillingResult) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> Unit
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                _state.value = BillingStateLogic.purchaseStopped(_state.value, "Purchase cancelled.")
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                _state.value = BillingStateLogic.purchaseStopped(
                    _state.value,
                    "Item is already owned. Restoring purchase...",
                )
                restorePurchases()
            }
            else -> handleBillingFailure(result, "Could not open the purchase screen.")
        }
    }

    private fun handleBillingFailure(result: BillingResult, fallback: String) {
        val detail = result.debugMessage.takeIf(String::isNotBlank)
        _state.value = BillingStateLogic.purchaseStopped(_state.value, detail ?: fallback)
        if (result.responseCode == BillingClient.BillingResponseCode.SERVICE_DISCONNECTED ||
            result.responseCode == BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE ||
            result.responseCode == BillingClient.BillingResponseCode.ERROR
        ) {
            scheduleRecovery()
        }
    }

    private fun scheduleRecovery() {
        if (closed || recoveryJob?.isActive == true) return
        val exponent = min(recoveryAttempt, MAX_RECOVERY_EXPONENT)
        val delayMs = min(MAX_RECOVERY_DELAY_MS, INITIAL_RECOVERY_DELAY_MS * (1L shl exponent))
        recoveryAttempt++
        recoveryJob = scope.launch {
            delay(delayMs)
            if (billingClient.isReady) {
                queryProductDetails()
                queryPurchases(showEmptyMessage = restoreRequested)
            } else {
                connect()
            }
        }
    }

    private companion object {
        const val BACKEND_ATTEMPTS = 3
        const val BACKEND_RETRY_DELAY_MS = 750L
        const val INITIAL_RECOVERY_DELAY_MS = 1_000L
        const val MAX_RECOVERY_DELAY_MS = 30_000L
        const val MAX_RECOVERY_EXPONENT = 5
    }
}
