package com.aftaab.rezumate.billing

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryPurchasesParams
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

class BillingReconciliationWorker(
    appContext: Context,
    workerParameters: WorkerParameters,
) : CoroutineWorker(appContext, workerParameters) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val billingClient = BillingClient.newBuilder(applicationContext)
            .setListener { _, _ -> }
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
            )
            .build()
        try {
            val setup = billingClient.connect()
            if (setup.responseCode != BillingClient.BillingResponseCode.OK) {
                return@withContext Result.retry()
            }

            val (queryResult, purchases) = billingClient.queryOwnedPurchases()
            if (queryResult.responseCode != BillingClient.BillingResponseCode.OK) {
                return@withContext Result.retry()
            }
            val matching = purchases.filter { REZUMATE_PRO_PRODUCT_ID in it.products }
            if (matching.any { it.purchaseState == Purchase.PurchaseState.PENDING }) {
                return@withContext Result.retry()
            }
            val completed = matching.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
            if (completed.isEmpty()) return@withContext Result.success()

            val backend = PaymentBackendClient(applicationContext)
            for (purchase in completed.distinctBy(Purchase::getPurchaseToken)) {
                try {
                    val response = backend.verify(
                        PaymentVerificationRequest(
                            purchaseToken = purchase.purchaseToken,
                            productId = REZUMATE_PRO_PRODUCT_ID,
                            packageName = applicationContext.packageName,
                        ),
                    )
                    if (response.verified && response.acknowledged) {
                        return@withContext Result.success()
                    }
                } catch (error: PaymentBackendException) {
                    return@withContext if (error.retryable) Result.retry() else Result.failure()
                } catch (_: Exception) {
                    return@withContext Result.retry()
                }
            }
            Result.retry()
        } finally {
            billingClient.endConnection()
        }
    }

    private suspend fun BillingClient.connect(): BillingResult =
        suspendCancellableCoroutine { continuation ->
            startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    if (continuation.isActive) continuation.resume(result)
                }

                override fun onBillingServiceDisconnected() {
                    if (continuation.isActive) {
                        continuation.resume(
                            BillingResult.newBuilder()
                                .setResponseCode(BillingClient.BillingResponseCode.SERVICE_DISCONNECTED)
                                .setDebugMessage("Google Play disconnected.")
                                .build(),
                        )
                    }
                }
            })
        }

    private suspend fun BillingClient.queryOwnedPurchases(): Pair<BillingResult, List<Purchase>> =
        suspendCancellableCoroutine { continuation ->
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            queryPurchasesAsync(params) { result, purchases ->
                if (continuation.isActive) continuation.resume(result to purchases)
            }
        }
}

object BillingReconciliationScheduler {
    private val networkConstraint = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    fun scheduleImmediate(context: Context) {
        val request = OneTimeWorkRequestBuilder<BillingReconciliationWorker>()
            .setConstraints(networkConstraint)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            IMMEDIATE_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    fun ensurePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<BillingReconciliationWorker>(12, TimeUnit.HOURS)
            .setConstraints(networkConstraint)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
            PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    private const val IMMEDIATE_WORK_NAME = "rezumate-pro-purchase-reconciliation"
    private const val PERIODIC_WORK_NAME = "rezumate-pro-periodic-reconciliation"
}
